// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IFlashLoanBase } from "../../interfaces/flashloan/IFlashLoanBase.sol";
import { IERC3156FlashLender } from "../../interfaces/flashloan/IERC3156FlashLender.sol";
import { IERC3156FlashBorrower } from "../../interfaces/flashloan/IERC3156FlashBorrower.sol";
import { ILendingPoolV2 } from "../../interfaces/protocols/aaveV2/ILendingPoolV2.sol";
import { IFlashLoans } from "../../interfaces/protocols/balancer/IFlashLoans.sol";
import { IUniswapV3Pool } from "../../interfaces/protocols/uniswap/v3/IUniswapV3Pool.sol";
import { IUniswapV3Factory } from "../../interfaces/protocols/uniswap/v3/IUniswapV3Factory.sol";
import { IMorphoBlue } from "../../interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import { IVaultMain } from "../../interfaces/protocols/balancerV3/IVaultMain.sol";
import { IERC20 } from "../../interfaces/token/IERC20.sol";

import { ActionBase } from "../ActionBase.sol";
import { ReentrancyGuard } from "../../_vendor/openzeppelin/ReentrancyGuard.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { FLHelper } from "./helpers/FLHelper.sol";

/// @title Executes recipe flash loans across supported lenders
/// @notice Borrows tokens, resumes the recipe through its wallet, and arranges lender repayment.
/// @dev RecipeExecutor calls this contract directly. Lender callbacks resume execution in the wallet
/// and supply the first asset's repayment amount as the value piped to subsequent actions.
contract FLAction is ActionBase, ReentrancyGuard, IFlashLoanBase, FLHelper {
    using TokenUtils for address;

    /// @dev The callback initiator is not this contract.
    error UntrustedInitiator();
    /// @dev The callback caller is not an accepted lender.
    error UntrustedLender();
    /// @dev The token balance does not satisfy the repayment requirement.
    error WrongPaybackAmountError();
    /// @dev The selected flash loan source is not handled.
    error NonexistentFLSource();

    /// @dev Maximum stETH deficit, in wei, eligible for a faucet top-up on mainnet.
    uint256 internal constant ST_ETH_PAYBACK_ROUNDING_TOLERANCE = 2;

    /// @dev Numeric values are encoded by the SDK in the first byte of flParamGetterData.
    /// Append new sources only; never reorder existing values. EMPTY is not a valid lender.
    enum FLSource {
        EMPTY,
        AAVEV2,
        BALANCER,
        GHO,
        MAKER,
        AAVEV3,
        UNIV3,
        SPARK,
        MORPHO_BLUE,
        CURVEUSD,
        BALANCER_V3
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    /// @notice Intentionally performs no action; flash loans must execute as part of a recipe.
    /// @dev Required by ActionBase. RecipeExecutor initiates flash loans through executeAction.
    /// @param _callData Unused.
    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    /// @notice Initiates a flash loan using the source encoded in flParamGetterData's first byte.
    /// @dev No parameter getter is called; flParamGetterAddr and action parameter mappings are ignored.
    /// recipeData must encode (Recipe, wallet). The lender callback supplies the repayment amount,
    /// including any fee, to RecipeExecutor.executeActionsFromFL as the first action's piped value.
    /// @param _callData ABI-encoded FlashLoanParams with the selected lender's parameter layout.
    /// @return The first requested principal amount; RecipeExecutor ignores this function's return.
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        FlashLoanParams memory params = abi.decode(_callData, (FlashLoanParams));
        FLSource source = FLSource(uint8(bytes1(params.flParamGetterData)));

        _initiateFlashLoan(params, source);

        return bytes32(params.amounts[0]);
    }

    /*//////////////////////////////////////////////////////////////
                         FLASHLOAN INITIATION
    //////////////////////////////////////////////////////////////*/
    /// @notice Dispatches the flash loan request to the selected lender.
    /// @param _flParams Lender-specific parameters and encoded recipe data.
    /// @param _source The flash loan source selected by the caller.
    function _initiateFlashLoan(FlashLoanParams memory _flParams, FLSource _source) internal {
        if (_source == FLSource.AAVEV2) {
            _flAaveV2(_flParams);
        } else if (_source == FLSource.BALANCER) {
            _flBalancer(_flParams);
        } else if (_source == FLSource.GHO) {
            _flGho(_flParams);
        } else if (_source == FLSource.MAKER) {
            _flMaker(_flParams);
        } else if (_source == FLSource.AAVEV3) {
            _flAaveV3(_flParams);
        } else if (_source == FLSource.UNIV3) {
            _flUniV3(_flParams);
        } else if (_source == FLSource.SPARK) {
            _flSpark(_flParams);
        } else if (_source == FLSource.MORPHO_BLUE) {
            _flMorphoBlue(_flParams);
        } else if (_source == FLSource.CURVEUSD) {
            _flCurveUSD(_flParams);
        } else if (_source == FLSource.BALANCER_V3) {
            _flBalancerV3(_flParams);
        } else {
            revert NonexistentFLSource();
        }
    }

    /// @notice Requests an Aave V2 flash loan with executeOperation as the callback.
    /// @param _flParams Tokens, amounts, debt modes, onBehalfOf, and encoded recipe data.
    function _flAaveV2(FlashLoanParams memory _flParams) internal {
        ILendingPoolV2(AAVE_LENDING_POOL)
            .flashLoan(
                address(this),
                _flParams.tokens,
                _flParams.amounts,
                _flParams.modes,
                _flParams.onBehalfOf,
                _flParams.recipeData,
                AAVE_REFERRAL_CODE
            );

        emit ActionEvent(
            "FLAction",
            abi.encode(
                "AAVEV2", _flParams.tokens, _flParams.amounts, _flParams.modes, _flParams.onBehalfOf
            )
        );
    }

    /// @notice Requests an Aave V3 flash loan with executeOperation as the callback.
    /// @param _flParams Tokens, amounts, debt modes, onBehalfOf, and encoded recipe data.
    function _flAaveV3(FlashLoanParams memory _flParams) internal {
        ILendingPoolV2(AAVE_V3_LENDING_POOL)
            .flashLoan(
                address(this),
                _flParams.tokens,
                _flParams.amounts,
                _flParams.modes,
                _flParams.onBehalfOf,
                _flParams.recipeData,
                AAVE_REFERRAL_CODE
            );

        emit ActionEvent(
            "FLAction",
            abi.encode(
                "AAVEV3", _flParams.tokens, _flParams.amounts, _flParams.modes, _flParams.onBehalfOf
            )
        );
    }

    /// @notice Requests a Balancer V2 flash loan with receiveFlashLoan as the callback.
    /// @param _flParams Tokens, matching amounts, and encoded recipe data.
    function _flBalancer(FlashLoanParams memory _flParams) internal {
        IFlashLoans(VAULT_ADDR)
            .flashLoan(address(this), _flParams.tokens, _flParams.amounts, _flParams.recipeData);

        emit ActionEvent("FLAction", abi.encode("BALANCER", _flParams));
    }

    /// @notice Unlocks the Balancer V3 vault to borrow and settle tokens in its callback.
    /// @param _flParams Tokens, matching amounts, and encoded recipe data.
    function _flBalancerV3(FlashLoanParams memory _flParams) internal {
        IVaultMain(BALANCER_V3_VAULT_ADDR)
            .unlock(abi.encodeWithSelector(this.receiveFlashLoanBalancerV3.selector, _flParams));

        emit ActionEvent("FLAction", abi.encode("BALANCER_V3", _flParams));
    }

    /// @notice Requests GHO from the flash minter with onFlashLoan as the callback.
    /// @param _flParams The amount at amounts[0] and encoded recipe data; the token is fixed to GHO.
    function _flGho(FlashLoanParams memory _flParams) internal {
        IERC3156FlashLender(GHO_FLASH_MINTER_ADDR)
            .flashLoan(
                IERC3156FlashBorrower(address(this)),
                GHO_ADDR,
                _flParams.amounts[0],
                _flParams.recipeData
            );

        emit ActionEvent("FLAction", abi.encode("GHO", _flParams.amounts[0]));
    }

    /// @notice Requests DAI from Maker with onFlashLoan as the callback.
    /// @param _flParams The amount at amounts[0] and encoded recipe data; the token is fixed to DAI.
    function _flMaker(FlashLoanParams memory _flParams) internal {
        IERC3156FlashLender(DSS_FLASH_ADDR)
            .flashLoan(
                IERC3156FlashBorrower(address(this)),
                DAI_ADDR,
                _flParams.amounts[0],
                _flParams.recipeData
            );

        emit ActionEvent("FLAction", abi.encode("MAKER", _flParams.amounts[0]));
    }

    /// @notice Requests a Uniswap V3 flash loan with uniswapV3FlashCallback as the callback.
    /// @dev Reuses modes[0] and modes[1] to encode this contract's pre-loan balances for borrowed
    /// tokens. Entries for tokens with a zero requested amount remain zero.
    /// @param _flParams tokens is [token0, token1, pool], amounts is [amount0, amount1], and
    /// recipeData encodes (Recipe, wallet). Incoming modes are ignored.
    function _flUniV3(FlashLoanParams memory _flParams) internal {
        // Preserve the existing callback encoding by storing the balance snapshots in modes.
        _flParams.modes = new uint256[](2);
        _flParams.modes[0] =
            _flParams.amounts[0] > 0 ? _flParams.tokens[0].getBalance(address(this)) : 0;
        _flParams.modes[1] =
            _flParams.amounts[1] > 0 ? _flParams.tokens[1].getBalance(address(this)) : 0;

        IUniswapV3Pool(_flParams.tokens[2])
            .flash(address(this), _flParams.amounts[0], _flParams.amounts[1], abi.encode(_flParams));

        emit ActionEvent("FLAction", abi.encode("UNIV3", _flParams.amounts[0]));
    }

    /// @notice Requests a Spark flash loan with executeOperation as the callback.
    /// @param _flParams Tokens, amounts, debt modes, onBehalfOf, and encoded recipe data.
    function _flSpark(FlashLoanParams memory _flParams) internal {
        ILendingPoolV2(SPARK_LENDING_POOL)
            .flashLoan(
                address(this),
                _flParams.tokens,
                _flParams.amounts,
                _flParams.modes,
                _flParams.onBehalfOf,
                _flParams.recipeData,
                SPARK_REFERRAL_CODE
            );

        emit ActionEvent("FLAction", abi.encode("SPARK", _flParams.amounts[0]));
    }

    /// @notice Requests a Morpho Blue flash loan with onMorphoFlashLoan as the callback.
    /// @param _flParams The token at tokens[0], amount at amounts[0], and encoded recipe data.
    function _flMorphoBlue(FlashLoanParams memory _flParams) internal {
        IMorphoBlue(MORPHO_BLUE_ADDR)
            .flashLoan(
                _flParams.tokens[0],
                _flParams.amounts[0],
                abi.encode(_flParams.recipeData, _flParams.tokens[0])
            );

        emit ActionEvent("FLAction", abi.encode("MORPHOBLUE", _flParams.amounts[0]));
    }

    /// @notice Requests crvUSD from Curve with onFlashLoan as the callback.
    /// @param _flParams The amount at amounts[0] and encoded recipe data; the token is fixed to crvUSD.
    function _flCurveUSD(FlashLoanParams memory _flParams) internal {
        IERC3156FlashLender(CURVEUSD_FLASH_ADDR)
            .flashLoan(
                IERC3156FlashBorrower(address(this)),
                CURVEUSD_ADDR,
                _flParams.amounts[0],
                _flParams.recipeData
            );

        emit ActionEvent("FLAction", abi.encode("CURVEUSD", _flParams.amounts[0]));
    }

    /*//////////////////////////////////////////////////////////////
                              CALLBACKS
    //////////////////////////////////////////////////////////////*/
    /// @notice Resumes the recipe for Aave V2, Aave V3, or Spark and approves lender repayment.
    /// @dev Requires a configured pool as caller and this contract as initiator. Snapshots balances
    /// after forwarding the loans, then pipes amounts[0] + fees[0] to the recipe. The pool pulls
    /// each principal plus fee after this callback returns.
    /// @param _assets Borrowed token addresses.
    /// @param _amounts Principal amounts in the same order as _assets.
    /// @param _fees Lender fees in the same order as _assets.
    /// @param _initiator Address that requested the flash loan.
    /// @param _params ABI-encoded (Recipe, wallet).
    /// @return True to acknowledge a successful callback.
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (
            msg.sender != AAVE_LENDING_POOL && msg.sender != AAVE_V3_LENDING_POOL
                && msg.sender != SPARK_LENDING_POOL
        ) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory recipe, address wallet) = abi.decode(_params, (Recipe, address));
        uint256[] memory balancesBeforeRecipe =
            _sendTokensToWalletAndSnapshot(_assets, _amounts, wallet);

        uint256 pipedRepaymentAmount = _amounts[0] + _fees[0];
        _executeRecipe(wallet, _getWalletType(wallet), recipe, pipedRepaymentAmount);

        // Preserve the recorded balances and approve each principal plus fee for collection.
        for (uint256 i = 0; i < _assets.length; i++) {
            uint256 repaymentAmount = _amounts[i] + _fees[i];
            _ensureRepaymentBalance(_assets[i], repaymentAmount + balancesBeforeRecipe[i]);

            _assets[i].approveToken(address(msg.sender), repaymentAmount);
        }

        return true;
    }

    /// @notice Borrows from Balancer V3, resumes the recipe, and settles repayment with the vault.
    /// @dev Only the configured vault may call this function. Tokens move directly from the vault
    /// to the wallet, so this contract's balances are recorded before those transfers. Loans have
    /// no fee; amounts[0] is piped to the recipe and each principal is transferred back and settled.
    /// @param _userData FlashLoanParams passed to unlock, with recipeData encoding (Recipe, wallet).
    function receiveFlashLoanBalancerV3(FlashLoanParams memory _userData) external nonReentrant {
        if (msg.sender != BALANCER_V3_VAULT_ADDR) {
            revert UntrustedLender();
        }

        (Recipe memory recipe, address wallet) = abi.decode(_userData.recipeData, (Recipe, address));

        uint256[] memory balancesBeforeRecipe = new uint256[](_userData.tokens.length);
        for (uint256 i = 0; i < _userData.tokens.length; i++) {
            balancesBeforeRecipe[i] = _userData.tokens[i].getBalance(address(this));
            // The loan bypasses this contract's token balance.
            IVaultMain(BALANCER_V3_VAULT_ADDR)
                .sendTo(IERC20(_userData.tokens[i]), wallet, _userData.amounts[i]);
        }

        _executeRecipe(wallet, _getWalletType(wallet), recipe, _userData.amounts[0]);

        for (uint256 i = 0; i < _userData.tokens.length; i++) {
            uint256 repaymentAmount = _userData.amounts[i];

            _ensureRepaymentBalance(_userData.tokens[i], repaymentAmount + balancesBeforeRecipe[i]);

            // Transfer the principal before settling the vault's outstanding debt.
            _userData.tokens[i].withdrawTokens(BALANCER_V3_VAULT_ADDR, repaymentAmount);
            IVaultMain(BALANCER_V3_VAULT_ADDR).settle(IERC20(_userData.tokens[i]), repaymentAmount);
        }
    }

    /// @notice Resumes the recipe for Balancer V2 and transfers repayment to the vault.
    /// @dev Only the configured vault may call this function. Snapshots balances after forwarding
    /// the loans, pipes amounts[0] + feeAmounts[0] to the recipe, and repays every principal plus fee.
    /// @param _tokens Borrowed token addresses.
    /// @param _amounts Principal amounts in the same order as _tokens.
    /// @param _feeAmounts Lender fees in the same order as _tokens.
    /// @param _userData ABI-encoded (Recipe, wallet).
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external nonReentrant {
        if (msg.sender != VAULT_ADDR) {
            revert UntrustedLender();
        }
        (Recipe memory recipe, address wallet) = abi.decode(_userData, (Recipe, address));

        uint256[] memory balancesBeforeRecipe =
            _sendTokensToWalletAndSnapshot(_tokens, _amounts, wallet);

        uint256 pipedRepaymentAmount = _amounts[0] + _feeAmounts[0];
        _executeRecipe(wallet, _getWalletType(wallet), recipe, pipedRepaymentAmount);

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 repaymentAmount = _amounts[i] + _feeAmounts[i];

            _ensureRepaymentBalance(_tokens[i], repaymentAmount + balancesBeforeRecipe[i]);

            _tokens[i].withdrawTokens(address(VAULT_ADDR), repaymentAmount);
        }
    }

    /// @notice Resumes the recipe for Maker, GHO, or Curve and arranges repayment.
    /// @dev Requires a configured lender as caller and this contract as initiator. Snapshots the
    /// balance after forwarding the loan and pipes the principal plus fee to the recipe. Curve is
    /// repaid by transfer; Maker and GHO receive approval to collect repayment after the callback.
    /// @param _initiator Address that requested the flash loan.
    /// @param _token Borrowed token address.
    /// @param _amount Principal amount.
    /// @param _fee Lender fee.
    /// @param _data ABI-encoded (Recipe, wallet).
    /// @return The ERC-3156 callback acknowledgement hash.
    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external nonReentrant returns (bytes32) {
        if (
            msg.sender != DSS_FLASH_ADDR && msg.sender != GHO_FLASH_MINTER_ADDR
                && msg.sender != CURVEUSD_FLASH_ADDR
        ) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory recipe, address wallet) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(wallet, _amount);
        uint256 balanceBeforeRecipe = _token.getBalance(address(this));

        uint256 repaymentAmount = _amount + _fee;

        _executeRecipe(wallet, _getWalletType(wallet), recipe, repaymentAmount);

        _ensureRepaymentBalance(_token, repaymentAmount + balanceBeforeRecipe);

        if (msg.sender == CURVEUSD_FLASH_ADDR) {
            _token.withdrawTokens(msg.sender, repaymentAmount);
        } else {
            _token.approveToken(msg.sender, repaymentAmount);
        }

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    /// @notice Resumes the recipe for Uniswap V3 and transfers repayment to the pool.
    /// @dev Authenticates the caller against the configured factory's pool for the token pair and
    /// caller's fee tier. Uses the pre-loan snapshots encoded by _flUniV3 in modes. The piped value
    /// is always amount0 + fee0, which is zero when only token1 is borrowed.
    /// @param _fee0 Fee owed for token0.
    /// @param _fee1 Fee owed for token1.
    /// @param _params ABI-encoded FlashLoanParams containing the recipe and balance snapshots.
    function uniswapV3FlashCallback(uint256 _fee0, uint256 _fee1, bytes memory _params)
        external
        nonReentrant
    {
        FlashLoanParams memory params = abi.decode(_params, (FlashLoanParams));
        {
            uint24 fee = IUniswapV3Pool(msg.sender).fee();
            address expectedPool = IUniswapV3Factory(UNI_V3_FACTORY)
                .getPool(params.tokens[0], params.tokens[1], uint24(fee));
            if (msg.sender != expectedPool) revert UntrustedLender();
        }

        (Recipe memory recipe, address wallet) = abi.decode(params.recipeData, (Recipe, address));

        params.tokens[0].withdrawTokens(wallet, params.amounts[0]);
        params.tokens[1].withdrawTokens(wallet, params.amounts[1]);

        uint256 pipedRepaymentAmount = params.amounts[0] + _fee0;
        _executeRecipe(wallet, _getWalletType(wallet), recipe, pipedRepaymentAmount);

        // modes contains pre-loan balances for borrowed tokens, recorded by _flUniV3.
        uint256 expectedBalance0 = params.modes[0] + params.amounts[0] + _fee0;
        uint256 expectedBalance1 = params.modes[1] + params.amounts[1] + _fee1;

        if (params.amounts[0] > 0) {
            _ensureRepaymentBalance(params.tokens[0], expectedBalance0);
        }
        if (params.amounts[1] > 0) {
            _ensureRepaymentBalance(params.tokens[1], expectedBalance1);
        }

        params.tokens[0].withdrawTokens(msg.sender, params.amounts[0] + _fee0);
        params.tokens[1].withdrawTokens(msg.sender, params.amounts[1] + _fee1);
    }

    /// @notice Resumes the recipe for Morpho Blue and approves repayment of the principal.
    /// @dev Only the configured Morpho Blue contract may call this function. Snapshots the balance
    /// after forwarding the loan. The loan has no fee, so the principal is piped to the recipe and
    /// approved for collection after the callback returns.
    /// @param _assets Principal amount of the borrowed token.
    /// @param _data ABI-encoded (recipeData, token), where recipeData encodes (Recipe, wallet).
    function onMorphoFlashLoan(uint256 _assets, bytes calldata _data) external nonReentrant {
        if (msg.sender != MORPHO_BLUE_ADDR) {
            revert UntrustedLender();
        }
        (bytes memory recipeData, address token) = abi.decode(_data, (bytes, address));
        (Recipe memory recipe, address wallet) = abi.decode(recipeData, (Recipe, address));

        token.withdrawTokens(wallet, _assets);

        uint256 balanceBeforeRecipe = token.getBalance(address(this));

        _executeRecipe(wallet, _getWalletType(wallet), recipe, _assets);

        _ensureRepaymentBalance(token, _assets + balanceBeforeRecipe);

        token.approveToken(MORPHO_BLUE_ADDR, _assets);
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/
    /// @notice Forwards loan principals to the wallet and records this contract's remaining balances.
    /// @dev Snapshots are taken after each transfer and before recipe execution, preserving the
    /// balances actually left in this contract, including any token transfer rounding.
    /// @param _tokens Borrowed token addresses.
    /// @param _amounts Principal amounts in the same order as _tokens.
    /// @param _wallet Wallet that receives the tokens and executes the recipe.
    /// @return balancesBeforeRecipe Token balances to preserve through repayment.
    function _sendTokensToWalletAndSnapshot(
        address[] memory _tokens,
        uint256[] memory _amounts,
        address _wallet
    ) internal returns (uint256[] memory balancesBeforeRecipe) {
        balancesBeforeRecipe = new uint256[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; ++i) {
            _tokens[i].withdrawTokens(_wallet, _amounts[i]);
            balancesBeforeRecipe[i] = _tokens[i].getBalance(address(this));
        }
    }

    /// @notice Ensures this contract holds the required token balance before lender repayment.
    /// @dev Requires exact equality except for a stETH deficit of at most two wei, which triggers
    /// a faucet top-up. Reverts if the top-up is insufficient; retains any resulting surplus of at
    /// most one wei because refunding it can transfer zero shares. Surplus before a top-up reverts.
    /// @param _token Token whose repayment balance is checked.
    /// @param _expectedBalance Recorded balance to preserve plus the loan principal and any fee.
    function _ensureRepaymentBalance(address _token, uint256 _expectedBalance) internal {
        uint256 currentBalance = _token.getBalance(address(this));
        if (currentBalance == _expectedBalance) return;

        // At this point, we only tolerate stETH having less than the expected balance.
        if (_token != ST_ETH_ADDR || currentBalance > _expectedBalance) {
            revert WrongPaybackAmountError();
        }

        // Tolerate up to 2 wei of stETH deficit.
        uint256 deficit = _expectedBalance - currentBalance;
        if (deficit > ST_ETH_PAYBACK_ROUNDING_TOLERANCE) {
            revert WrongPaybackAmountError();
        }

        // Take 2 wei of stETH to cover the rounding deficit.
        feeFaucet.my2Wei(ST_ETH_ADDR);

        currentBalance = ST_ETH_ADDR.getBalance(address(this));

        // stETH transfers round down to shares, so the top-up may deliver less than 2 wei.
        if (currentBalance < _expectedBalance) revert WrongPaybackAmountError();

        // Keep any surplus from the top-up (at most 1 wei). Transferring 1 wei of stETH
        // can move zero shares, so attempting to refund it cannot guarantee exact equality.
    }
}
