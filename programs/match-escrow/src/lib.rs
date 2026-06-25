use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h");

pub const MAX_ALLOWED_MINTS: usize = 16;
pub const MATCH_SEED: &[u8] = b"match";
pub const CONFIG_SEED: &[u8] = b"config";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const VAULT_SEED: &[u8] = b"vault";
/// Host must wait this long without an opponent before cancel returns their deposit.
pub const CANCEL_REFUND_MIN_WAIT_SECS: i64 = 90;

#[program]
pub mod match_escrow {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        house_rake_bps: u16,
        fee_recipient: Pubkey,
        allowed_mints: Vec<Pubkey>,
    ) -> Result<()> {
        require!(house_rake_bps <= 2_000, MatchEscrowError::RakeTooHigh);
        require!(
            allowed_mints.len() <= MAX_ALLOWED_MINTS,
            MatchEscrowError::TooManyMints
        );
        require!(fee_recipient != Pubkey::default(), MatchEscrowError::InvalidFeeRecipient);

        let config = &mut ctx.accounts.global_config;
        config.authority = ctx.accounts.authority.key();
        config.house_rake_bps = house_rake_bps;
        config.fee_recipient = fee_recipient;
        config.house_treasury = ctx.accounts.house_treasury.key();
        config.allowed_mints = allowed_mints;
        config.bump = ctx.bumps.global_config;
        config.treasury_bump = ctx.bumps.house_treasury;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        house_rake_bps: Option<u16>,
        allowed_mints: Option<Vec<Pubkey>>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.global_config;
        if let Some(rake) = house_rake_bps {
            require!(rake <= 2_000, MatchEscrowError::RakeTooHigh);
            config.house_rake_bps = rake;
        }
        if let Some(mints) = allowed_mints {
            require!(mints.len() <= MAX_ALLOWED_MINTS, MatchEscrowError::TooManyMints);
            config.allowed_mints = mints;
        }
        Ok(())
    }

    pub fn create_match(
        ctx: Context<CreateMatch>,
        bet_amount: u64,
        match_id: [u8; 16],
        rake_bps: u16,
    ) -> Result<()> {
        let config = &ctx.accounts.global_config;
        let match_account = &mut ctx.accounts.match_account;

        require!(bet_amount > 0, MatchEscrowError::InvalidBetAmount);
        require!(rake_bps <= 2_000, MatchEscrowError::RakeTooHigh);

        if let Some(mint) = ctx.accounts.token_mint.as_ref() {
            require!(
                config.is_mint_allowed(&mint.key()),
                MatchEscrowError::MintNotAllowed
            );
        }

        match_account.player1 = ctx.accounts.player1.key();
        match_account.player2 = Pubkey::default();
        match_account.bet_amount = bet_amount;
        match_account.token_mint = ctx.accounts.token_mint.as_ref().map(|m| m.key());
        match_account.escrow_vault = ctx.accounts.escrow_vault.key();
        match_account.status = MatchStatus::Waiting as u8;
        match_account.winner = Pubkey::default();
        match_account.match_id = match_id;
        match_account.rake_bps = rake_bps;
        match_account.player1_funded = false;
        match_account.player2_funded = false;
        match_account.created_at = Clock::get()?.unix_timestamp;
        match_account.bump = ctx.bumps.match_account;

        deposit_to_vault(
            &ctx.accounts.escrow_vault,
            &ctx.accounts.player1,
            &ctx.accounts.player1_token_account,
            &ctx.accounts.token_program,
            &ctx.accounts.system_program,
            match_account.token_mint.is_some(),
            bet_amount,
        )?;
        match_account.player1_funded = true;
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Waiting as u8,
            MatchEscrowError::InvalidMatchStatus
        );
        require!(
            match_account.player1_funded,
            MatchEscrowError::InvalidMatchStatus
        );
        require!(
            match_account.player1 != ctx.accounts.player2.key(),
            MatchEscrowError::CannotJoinOwnMatch
        );

        match_account.player2 = ctx.accounts.player2.key();
        let bet_amount = match_account.bet_amount;
        deposit_to_vault(
            &ctx.accounts.escrow_vault,
            &ctx.accounts.player2,
            &ctx.accounts.player2_token_account,
            &ctx.accounts.token_program,
            &ctx.accounts.system_program,
            match_account.token_mint.is_some(),
            bet_amount,
        )?;
        match_account.player2_funded = true;
        match_account.status = MatchStatus::Funded as u8;
        Ok(())
    }

    pub fn fund_match(ctx: Context<FundMatch>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        let status = match_account.status;
        require!(
            status == MatchStatus::Joined as u8,
            MatchEscrowError::InvalidMatchStatus
        );
        require!(
            match_account.player2 != Pubkey::default(),
            MatchEscrowError::InvalidMatchStatus
        );

        let bet_amount = match_account.bet_amount;
        let signer = ctx.accounts.player.key();

        if signer == match_account.player1 {
            require!(!match_account.player1_funded, MatchEscrowError::AlreadyFunded);
            deposit_to_vault(
                &ctx.accounts.escrow_vault,
                &ctx.accounts.player,
                &ctx.accounts.player_token_account,
                &ctx.accounts.token_program,
                &ctx.accounts.system_program,
                match_account.token_mint.is_some(),
                bet_amount,
            )?;
            match_account.player1_funded = true;
        } else if signer == match_account.player2 {
            require!(
                match_account.player2 != Pubkey::default(),
                MatchEscrowError::InvalidMatchStatus
            );
            require!(!match_account.player2_funded, MatchEscrowError::AlreadyFunded);
            deposit_to_vault(
                &ctx.accounts.escrow_vault,
                &ctx.accounts.player,
                &ctx.accounts.player_token_account,
                &ctx.accounts.token_program,
                &ctx.accounts.system_program,
                match_account.token_mint.is_some(),
                bet_amount,
            )?;
            match_account.player2_funded = true;
        } else {
            return Err(MatchEscrowError::InvalidPlayer.into());
        }

        if match_account.player1_funded && match_account.player2_funded {
            match_account.status = MatchStatus::Funded as u8;
        }
        Ok(())
    }

    pub fn settle_match(ctx: Context<SettleMatch>, is_draw: u8) -> Result<()> {
        let bet = ctx.accounts.match_account.bet_amount;
        let match_key = ctx.accounts.match_account.key();
        let match_bump = ctx.accounts.match_account.bump;
        let match_authority = ctx.accounts.match_account.to_account_info();
        let token_mint = ctx.accounts.match_account.token_mint;
        let rake_bps = ctx.accounts.match_account.rake_bps;
        let player1 = ctx.accounts.match_account.player1;
        let player2 = ctx.accounts.match_account.player2;
        let status = ctx.accounts.match_account.status;

        require!(
            status == MatchStatus::Funded as u8 || status == MatchStatus::Playing as u8,
            MatchEscrowError::InvalidMatchStatus
        );

        let pot = bet
            .checked_mul(2)
            .ok_or(MatchEscrowError::MathOverflow)?;

        if is_draw == 1 {
            settle_draw_with_rake(
                &ctx,
                match_key,
                match_bump,
                token_mint.is_some(),
                bet,
                rake_bps,
            )?;
            ctx.accounts.match_account.status = MatchStatus::Draw as u8;
            return Ok(());
        } else {
            let winner_key = ctx.accounts.winner.key();
            require!(
                winner_key == player1 || winner_key == player2,
                MatchEscrowError::InvalidWinner
            );

            let rake = pot
                .checked_mul(rake_bps as u64)
                .ok_or(MatchEscrowError::MathOverflow)?
                .checked_div(10_000)
                .ok_or(MatchEscrowError::MathOverflow)?;
            let payout = pot.checked_sub(rake).ok_or(MatchEscrowError::MathOverflow)?;

            if token_mint.is_some() {
                transfer_from_vault_spl(
                    &ctx.accounts.escrow_vault,
                    &match_authority,
                    match_key,
                    match_bump,
                    &ctx.accounts.token_program,
                    payout,
                    ctx.accounts.winner_token_account.as_ref().unwrap(),
                )?;
                if rake > 0 {
                    transfer_from_vault_spl(
                        &ctx.accounts.escrow_vault,
                        &match_authority,
                        match_key,
                        match_bump,
                        &ctx.accounts.token_program,
                        rake,
                        ctx.accounts.fee_recipient_token_account.as_ref().unwrap(),
                    )?;
                }
            } else {
                transfer_from_vault_sol(
                    &ctx.accounts.escrow_vault,
                    match_key,
                    payout,
                    &ctx.accounts.winner.to_account_info(),
                )?;
                if rake > 0 {
                    transfer_from_vault_sol(
                        &ctx.accounts.escrow_vault,
                        match_key,
                        rake,
                        &ctx.accounts.fee_recipient.to_account_info(),
                    )?;
                }
            }

            ctx.accounts.match_account.winner = winner_key;
            ctx.accounts.match_account.status = MatchStatus::Settled as u8;
            return Ok(());
        }

    }

    pub fn cancel_match(ctx: Context<CancelMatch>) -> Result<()> {
        let match_account = &ctx.accounts.match_account;
        let status = match_account.status;
        require!(
            status == MatchStatus::Waiting as u8 || status == MatchStatus::Joined as u8,
            MatchEscrowError::InvalidMatchStatus
        );

        let bet = match_account.bet_amount;
        let match_key = match_account.key();
        let match_bump = match_account.bump;
        let match_authority = match_account.to_account_info();
        let no_opponent = match_account.player2 == Pubkey::default();
        let now = Clock::get()?.unix_timestamp;
        let early_forfeit = no_opponent
            && (now - match_account.created_at) < CANCEL_REFUND_MIN_WAIT_SECS;

        if match_account.player1_funded {
            disburse_player1_waiting_deposit(
                match_account,
                &ctx.accounts.escrow_vault,
                &ctx.accounts.player1.to_account_info(),
                &ctx.accounts.fee_recipient.to_account_info(),
                ctx.accounts.player1_token_account.as_ref(),
                ctx.accounts.fee_recipient_token_account.as_ref(),
                &ctx.accounts.token_program,
                early_forfeit,
            )?;
        }

        if match_account.player2_funded {
            if match_account.token_mint.is_some() {
                transfer_from_vault_spl(
                    &ctx.accounts.escrow_vault,
                    &match_authority,
                    match_key,
                    match_bump,
                    &ctx.accounts.token_program,
                    bet,
                    ctx.accounts.player2_token_account.as_ref().unwrap(),
                )?;
            } else {
                transfer_from_vault_sol(
                    &ctx.accounts.escrow_vault,
                    match_key,
                    bet,
                    &ctx.accounts.player2.to_account_info(),
                )?;
            }
        }

        ctx.accounts.match_account.status = MatchStatus::Cancelled as u8;
        Ok(())
    }

    pub fn close_waiting_match(
        ctx: Context<CloseWaitingMatch>,
        force_forfeit: bool,
    ) -> Result<()> {
        let match_account = &ctx.accounts.match_account;
        require!(
            match_account.status == MatchStatus::Waiting as u8,
            MatchEscrowError::InvalidMatchStatus
        );
        require!(
            match_account.player2 == Pubkey::default(),
            MatchEscrowError::InvalidMatchStatus
        );

        let now = Clock::get()?.unix_timestamp;
        let early_forfeit = force_forfeit
            || (now - match_account.created_at) < CANCEL_REFUND_MIN_WAIT_SECS;

        if match_account.player1_funded {
            disburse_player1_waiting_deposit(
                match_account,
                &ctx.accounts.escrow_vault,
                &ctx.accounts.player1.to_account_info(),
                &ctx.accounts.fee_recipient.to_account_info(),
                ctx.accounts.player1_token_account.as_ref(),
                ctx.accounts.fee_recipient_token_account.as_ref(),
                &ctx.accounts.token_program,
                early_forfeit,
            )?;
        }

        ctx.accounts.match_account.status = MatchStatus::Cancelled as u8;
        Ok(())
    }

    pub fn claim_timeout(ctx: Context<SettleMatch>) -> Result<()> {
        settle_match(ctx, 0)
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        let treasury = &ctx.accounts.house_treasury;
        let config = &ctx.accounts.global_config;

        if config.allowed_mints.is_empty() {
            let rent = Rent::get()?.minimum_balance(0);
            let available = treasury.lamports().saturating_sub(rent);
            require!(amount <= available, MatchEscrowError::InsufficientFunds);

            **treasury.to_account_info().try_borrow_mut_lamports()? -= amount;
            **ctx
                .accounts
                .authority
                .to_account_info()
                .try_borrow_mut_lamports()? += amount;
        } else {
            let treasury_bump = config.treasury_bump;
            let treasury_seeds = [TREASURY_SEED, &[treasury_bump]];
            let signer = [&treasury_seeds[..]];
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_token_account.as_ref().unwrap().to_account_info(),
                    to: ctx.accounts.authority_token_account.as_ref().unwrap().to_account_info(),
                    authority: treasury.to_account_info(),
                },
                &signer,
            );
            token::transfer(cpi_ctx, amount)?;
        }
        Ok(())
    }
}

fn deposit_to_vault<'info>(
    escrow_vault: &AccountInfo<'info>,
    player: &Signer<'info>,
    player_token_account: &Option<Account<'info, TokenAccount>>,
    token_program: &Program<'info, Token>,
    system_program: &Program<'info, System>,
    spl_match: bool,
    amount: u64,
) -> Result<()> {
    if spl_match {
        let cpi_ctx = CpiContext::new(
            token_program.to_account_info(),
            Transfer {
                from: player_token_account.as_ref().unwrap().to_account_info(),
                to: escrow_vault.to_account_info(),
                authority: player.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;
    } else {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &player.key(),
            &escrow_vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                player.to_account_info(),
                escrow_vault.clone(),
                system_program.to_account_info(),
            ],
        )?;
    }
    Ok(())
}

fn settle_draw_with_rake<'info>(
    ctx: &Context<SettleMatch>,
    match_key: Pubkey,
    match_bump: u8,
    spl_match: bool,
    bet: u64,
    rake_bps: u16,
) -> Result<()> {
    let pot = bet
        .checked_mul(2)
        .ok_or(MatchEscrowError::MathOverflow)?;
    let rake = pot
        .checked_mul(rake_bps as u64)
        .ok_or(MatchEscrowError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(MatchEscrowError::MathOverflow)?;
    let net = pot.checked_sub(rake).ok_or(MatchEscrowError::MathOverflow)?;
    let refund1 = net / 2;
    let refund2 = net - refund1;
    let match_authority = ctx.accounts.match_account.to_account_info();

    if spl_match {
        transfer_from_vault_spl(
            &ctx.accounts.escrow_vault,
            &match_authority,
            match_key,
            match_bump,
            &ctx.accounts.token_program,
            refund1,
            ctx.accounts.player1_token_account.as_ref().unwrap(),
        )?;
        transfer_from_vault_spl(
            &ctx.accounts.escrow_vault,
            &match_authority,
            match_key,
            match_bump,
            &ctx.accounts.token_program,
            refund2,
            ctx.accounts.player2_token_account.as_ref().unwrap(),
        )?;
        if rake > 0 {
            transfer_from_vault_spl(
                &ctx.accounts.escrow_vault,
                &match_authority,
                match_key,
                match_bump,
                &ctx.accounts.token_program,
                rake,
                ctx.accounts.fee_recipient_token_account.as_ref().unwrap(),
            )?;
        }
    } else {
        transfer_from_vault_sol(
            &ctx.accounts.escrow_vault,
            match_key,
            refund1,
            &ctx.accounts.player1.to_account_info(),
        )?;
        transfer_from_vault_sol(
            &ctx.accounts.escrow_vault,
            match_key,
            refund2,
            &ctx.accounts.player2.to_account_info(),
        )?;
        if rake > 0 {
            transfer_from_vault_sol(
                &ctx.accounts.escrow_vault,
                match_key,
                rake,
                &ctx.accounts.fee_recipient.to_account_info(),
            )?;
        }
    }
    Ok(())
}

fn disburse_player1_waiting_deposit<'info>(
    match_account: &Account<'info, Match>,
    escrow_vault: &AccountInfo<'info>,
    player1: &AccountInfo<'info>,
    fee_recipient: &AccountInfo<'info>,
    player1_token_account: Option<&Account<'info, TokenAccount>>,
    fee_recipient_token_account: Option<&Account<'info, TokenAccount>>,
    token_program: &Program<'info, Token>,
    early_forfeit: bool,
) -> Result<()> {
    require!(
        match_account.player1_funded,
        MatchEscrowError::InvalidMatchStatus
    );

    let bet = match_account.bet_amount;
    let match_key = match_account.key();
    let match_bump = match_account.bump;
    let match_authority = match_account.to_account_info();
    let (destination, destination_token) = if early_forfeit {
        (
            fee_recipient,
            fee_recipient_token_account,
        )
    } else {
        (player1, player1_token_account)
    };

    if match_account.token_mint.is_some() {
        transfer_from_vault_spl(
            escrow_vault,
            &match_authority,
            match_key,
            match_bump,
            token_program,
            bet,
            destination_token.ok_or(MatchEscrowError::InvalidMatchStatus)?,
        )?;
    } else {
        transfer_from_vault_sol(escrow_vault, match_key, bet, destination)?;
    }
    Ok(())
}

fn transfer_from_vault_sol<'info>(
    escrow_vault: &AccountInfo<'info>,
    match_key: Pubkey,
    amount: u64,
    destination: &AccountInfo<'info>,
) -> Result<()> {
    let (_, vault_bump) = Pubkey::find_program_address(
        &[VAULT_SEED, match_key.as_ref()],
        &crate::ID,
    );
    let seeds: &[&[u8]] = &[VAULT_SEED, match_key.as_ref(), &[vault_bump]];
    let signer = &[seeds];

    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &escrow_vault.key(),
        &destination.key(),
        amount,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[escrow_vault.clone(), destination.clone()],
        signer,
    )?;
    Ok(())
}

fn transfer_from_vault_spl<'info>(
    escrow_vault: &AccountInfo<'info>,
    match_authority: &AccountInfo<'info>,
    match_key: Pubkey,
    match_bump: u8,
    token_program: &Program<'info, Token>,
    amount: u64,
    destination: &Account<'info, TokenAccount>,
) -> Result<()> {
    let seeds: &[&[u8]] = &[MATCH_SEED, match_key.as_ref(), &[match_bump]];
    let signer = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: escrow_vault.to_account_info(),
            to: destination.to_account_info(),
            authority: match_authority.clone(),
        },
        signer,
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    /// CHECK: treasury PDA holds SOL rake
    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [TREASURY_SEED],
        bump
    )]
    pub house_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = global_config.bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
#[instruction(bet_amount: u64, match_id: [u8; 16], rake_bps: u16)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub player1: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        init,
        payer = player1,
        space = 8 + Match::INIT_SPACE,
        seeds = [MATCH_SEED, match_id.as_ref()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: SOL vault or SPL token account
    #[account(
        mut,
        seeds = [VAULT_SEED, match_account.key().as_ref()],
        bump
    )]
    pub escrow_vault: AccountInfo<'info>,
    pub token_mint: Option<Account<'info, Mint>>,
    pub player1_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut)]
    pub player2: Signer<'info>,
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.as_ref()],
        bump = match_account.bump
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: vault
    #[account(mut, address = match_account.escrow_vault)]
    pub escrow_vault: AccountInfo<'info>,
    pub player2_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundMatch<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        has_one = escrow_vault
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: vault
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    pub player_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMatch<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = global_config.bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        has_one = escrow_vault
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: winner wallet
    #[account(mut)]
    pub winner: AccountInfo<'info>,
    /// CHECK: player1 for draw refunds
    #[account(mut, address = match_account.player1)]
    pub player1: AccountInfo<'info>,
    /// CHECK: player2 for draw refunds
    #[account(mut, address = match_account.player2)]
    pub player2: AccountInfo<'info>,
    /// CHECK: vault
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    /// CHECK: wallet that receives house rake (configured at init)
    #[account(mut, address = global_config.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    pub token_mint: Option<Account<'info, Mint>>,
    pub winner_token_account: Option<Account<'info, TokenAccount>>,
    pub fee_recipient_token_account: Option<Account<'info, TokenAccount>>,
    pub player1_token_account: Option<Account<'info, TokenAccount>>,
    pub player2_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelMatch<'info> {
    #[account(mut)]
    pub player1: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        has_one = player1,
        has_one = escrow_vault
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: vault
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    /// CHECK: player2 refund on cancel
    #[account(mut, address = match_account.player2)]
    pub player2: AccountInfo<'info>,
    /// CHECK: receives early-cancel forfeit when host cancels before min wait
    #[account(mut, address = global_config.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    pub player1_token_account: Option<Account<'info, TokenAccount>>,
    pub player2_token_account: Option<Account<'info, TokenAccount>>,
    pub fee_recipient_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseWaitingMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = global_config.bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(
        mut,
        seeds = [MATCH_SEED, match_account.match_id.as_ref()],
        bump = match_account.bump,
        has_one = escrow_vault
    )]
    pub match_account: Account<'info, Match>,
    /// CHECK: vault
    #[account(mut)]
    pub escrow_vault: AccountInfo<'info>,
    /// CHECK: host wallet — refund destination when eligible
    #[account(mut, address = match_account.player1)]
    pub player1: AccountInfo<'info>,
    /// CHECK: default when no opponent has joined
    #[account(mut, address = match_account.player2)]
    pub player2: AccountInfo<'info>,
    /// CHECK: receives early-close forfeit (full entry as rake)
    #[account(mut, address = global_config.fee_recipient)]
    pub fee_recipient: AccountInfo<'info>,
    pub player1_token_account: Option<Account<'info, TokenAccount>>,
    pub fee_recipient_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = global_config.bump,
        has_one = authority,
        has_one = house_treasury
    )]
    pub global_config: Account<'info, GlobalConfig>,
    /// CHECK: treasury PDA
    #[account(mut, seeds = [TREASURY_SEED], bump = global_config.treasury_bump)]
    pub house_treasury: AccountInfo<'info>,
    pub treasury_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub authority_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub house_rake_bps: u16,
    pub fee_recipient: Pubkey,
    pub house_treasury: Pubkey,
    #[max_len(MAX_ALLOWED_MINTS)]
    pub allowed_mints: Vec<Pubkey>,
    pub bump: u8,
    pub treasury_bump: u8,
}

impl GlobalConfig {
    pub fn is_mint_allowed(&self, mint: &Pubkey) -> bool {
        self.allowed_mints.iter().any(|m| m == mint)
    }
}

#[account]
#[derive(InitSpace)]
pub struct Match {
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub bet_amount: u64,
    pub rake_bps: u16,
    pub token_mint: Option<Pubkey>,
    pub escrow_vault: Pubkey,
    pub status: u8,
    pub winner: Pubkey,
    pub match_id: [u8; 16],
    pub player1_funded: bool,
    pub player2_funded: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[repr(u8)]
pub enum MatchStatus {
    Waiting = 0,
    Funded = 1,
    Playing = 2,
    Settled = 3,
    Cancelled = 4,
    Draw = 5,
    Joined = 6,
}

#[error_code]
pub enum MatchEscrowError {
    #[msg("House rake exceeds maximum (20%)")]
    RakeTooHigh,
    #[msg("Too many allowed mints")]
    TooManyMints,
    #[msg("Token mint not in allowlist")]
    MintNotAllowed,
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    #[msg("Invalid match status for this action")]
    InvalidMatchStatus,
    #[msg("Cannot join your own match")]
    CannotJoinOwnMatch,
    #[msg("Winner must be a match player")]
    InvalidWinner,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient treasury funds")]
    InsufficientFunds,
    #[msg("Invalid fee recipient")]
    InvalidFeeRecipient,
    #[msg("Player is not part of this match")]
    InvalidPlayer,
    #[msg("Player already funded this match")]
    AlreadyFunded,
}
