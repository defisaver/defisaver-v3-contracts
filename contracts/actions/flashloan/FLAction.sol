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

/// @title Action that gets and receives FL from different variety of sources
contract FLAction is ActionBase, ReentrancyGuard, IFlashLoanBase, FLHelper {
    using TokenUtils for address;

    /// @dev FL Initiator must be this contract
    error UntrustedInitiator();
    /// @dev Caller in these functions must be relevant FL source address
    error UntrustedLender();
    // Wrong FL payback amount sent
    error WrongPaybackAmountError();
    // When FL source is not found
    error NonexistentFLSource();

    // Used for stETH payback rounding tolerance. Only used for mainnet.
    uint256 internal constant ST_ETH_PAYBACK_ROUNDING_TOLERANCE = 2;

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

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override { }

    /// @inheritdoc ActionBase
    /// @notice This action doesn't use flParamGetterAddr and flParamGetterData
    /// @notice flParamGetterData is used to choose between FL providers
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable override returns (bytes32) {
        FlashLoanParams memory params = abi.decode(_callData, (FlashLoanParams));
        FLSource flSource = FLSource(uint8(bytes1(params.flParamGetterData)));

        _handleFlashloan(params, flSource);

        // In practice, this value is not used and is overwritten in RecipeExecutor:executeActionsFromFL,
        // where the actual flash loan amount (including fees) is set as the first return value,
        // which is then used by subsequent actions.
        return bytes32(params.amounts[0]);
    }

    /*//////////////////////////////////////////////////////////////
                         FLASHLOAN INITIATION
    //////////////////////////////////////////////////////////////*/
    /// @notice Handles the flash loan initiation based on the source
    /// @param _flParams All the amounts/tokens and related fl data
    /// @param _source The source of the flash loan
    function _handleFlashloan(FlashLoanParams memory _flParams, FLSource _source) internal {
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

    /// @notice Gets a Fl from Aave and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
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

    /// @notice Gets a Fl from Aave V3 and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
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

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related balancer fl data
    function _flBalancer(FlashLoanParams memory _flParams) internal {
        IFlashLoans(VAULT_ADDR)
            .flashLoan(address(this), _flParams.tokens, _flParams.amounts, _flParams.recipeData);

        emit ActionEvent("FLAction", abi.encode("BALANCER", _flParams));
    }

    /// @notice Gets a FL from Balancer V3 and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related balancer v3 fl data
    function _flBalancerV3(FlashLoanParams memory _flParams) internal {
        IVaultMain(BALANCER_V3_VAULT_ADDR)
            .unlock(abi.encodeWithSelector(this.receiveFlashLoanBalancerV3.selector, _flParams));

        emit ActionEvent("FLAction", abi.encode("BALANCER_V3", _flParams));
    }

    /// @notice Gets a GHO FL from Gho Flash Minter
    /// @param _flParams All the amounts/tokens and related gho fl data
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

    /// @notice Gets a DAI flash loan from Maker and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related maker fl data
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

    /// @notice Gets a FL from Uniswap V3 and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related univ3 fl data
    function _flUniV3(FlashLoanParams memory _flParams) internal {
        // modes aren't used so we set them to later know starting balances
        _flParams.modes = new uint256[](2);
        _flParams.modes[0] =
            _flParams.amounts[0] > 0 ? _flParams.tokens[0].getBalance(address(this)) : 0;
        _flParams.modes[1] =
            _flParams.amounts[1] > 0 ? _flParams.tokens[1].getBalance(address(this)) : 0;

        /// @dev FlashLoanParams.tokens, first two array indexes contain tokens, third index contains pool address
        IUniswapV3Pool(_flParams.tokens[2])
            .flash(address(this), _flParams.amounts[0], _flParams.amounts[1], abi.encode(_flParams));

        emit ActionEvent("FLAction", abi.encode("UNIV3", _flParams.amounts[0]));
    }

    /// @notice Gets a Fl from Spark and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related spark fl data
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

    /// @notice Gets a FL from Morpho blue and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related morpho blue fl data
    function _flMorphoBlue(FlashLoanParams memory _flParams) internal {
        IMorphoBlue(MORPHO_BLUE_ADDR)
            .flashLoan(
                _flParams.tokens[0],
                _flParams.amounts[0],
                abi.encode(_flParams.recipeData, _flParams.tokens[0])
            );

        emit ActionEvent("FLAction", abi.encode("MORPHOBLUE", _flParams.amounts[0]));
    }

    /// @notice Gets a FL from Curve USD and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related curve usd fl data
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
    /// @notice Aave callback function that formats and calls back RecipeExecutor
    /// FLSource == AAVE | SPARK
    /// Can have fees = YES
    /// @dev Only first flash loan amount will be accessible to other recipe actions.
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

        (Recipe memory currRecipe, address wallet) = abi.decode(_params, (Recipe, address));
        uint256[] memory balancesBefore = _sendTokensToWalletAndSnapshot(_assets, _amounts, wallet);

        // DFS actions can return only one value that can be used by other actions,
        // so we limit the return value to the first flash loan amount, including any fees if present.
        uint256 pipedReturnValue = _amounts[0] + _fees[0];
        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, pipedReturnValue);

        // return FL
        for (uint256 i = 0; i < _assets.length; i++) {
            uint256 paybackAmount = _amounts[i] + _fees[i];
            _verifyPaybackAmount(_assets[i], paybackAmount + balancesBefore[i]);

            _assets[i].approveToken(address(msg.sender), paybackAmount);
        }

        return true;
    }

    /// @notice Balancer V3 FL callback function that formats and calls back RecipeExecutor
    /// FLSource == BALANCER_V3
    /// Can have fees = NO
    /// @dev Only first flash loan amount will be accessible to other recipe actions.
    function receiveFlashLoanBalancerV3(FlashLoanParams memory _userData) external nonReentrant {
        if (msg.sender != BALANCER_V3_VAULT_ADDR) {
            revert UntrustedLender();
        }

        (Recipe memory currRecipe, address wallet) =
            abi.decode(_userData.recipeData, (Recipe, address));

        uint256[] memory balancesBefore = new uint256[](_userData.tokens.length);
        for (uint256 i = 0; i < _userData.tokens.length; i++) {
            balancesBefore[i] = _userData.tokens[i].getBalance(address(this));
            // Send token from the vault directly to the wallet
            IVaultMain(BALANCER_V3_VAULT_ADDR)
                .sendTo(IERC20(_userData.tokens[i]), wallet, _userData.amounts[i]);
        }

        // DFS actions can return only one value that can be used by other actions,
        // so we limit the return value to the first flash loan amount
        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, _userData.amounts[0]);

        for (uint256 i = 0; i < _userData.tokens.length; i++) {
            uint256 paybackAmount = _userData.amounts[i];

            _verifyPaybackAmount(_userData.tokens[i], paybackAmount + balancesBefore[i]);

            // Send tokens back to Balancer V3 Vault - repay the loan
            _userData.tokens[i].withdrawTokens(BALANCER_V3_VAULT_ADDR, paybackAmount);
            // Settle the repayment
            IVaultMain(BALANCER_V3_VAULT_ADDR).settle(IERC20(_userData.tokens[i]), paybackAmount);
        }
    }

    /// @notice Balancer FL callback function that formats and calls back RecipeExecutor
    /// FLSource == BALANCER
    /// Can have fees = YES
    /// @dev Only first flash loan amount will be accessible to other recipe actions.
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external nonReentrant {
        if (msg.sender != VAULT_ADDR) {
            revert UntrustedLender();
        }
        (Recipe memory currRecipe, address wallet) = abi.decode(_userData, (Recipe, address));

        uint256[] memory balancesBefore = _sendTokensToWalletAndSnapshot(_tokens, _amounts, wallet);

        // DFS actions can return only one value that can be used by other actions,
        // so we limit the return value to the first flash loan amount, including any fees if present.
        uint256 pipedReturnValue = _amounts[0] + _feeAmounts[0];
        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, pipedReturnValue);

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i] + _feeAmounts[i];

            _verifyPaybackAmount(_tokens[i], paybackAmount + balancesBefore[i]);

            _tokens[i].withdrawTokens(address(VAULT_ADDR), paybackAmount);
        }
    }

    /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
    /// FLSource == MAKER | GHO | CURVEUSD
    /// Can have fees = YES
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

        (Recipe memory currRecipe, address wallet) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(wallet, _amount);
        uint256 balanceBefore = _token.getBalance(address(this));

        uint256 paybackAmount = _amount + _fee;

        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, paybackAmount);

        _verifyPaybackAmount(_token, paybackAmount + balanceBefore);

        if (msg.sender == CURVEUSD_FLASH_ADDR) {
            _token.withdrawTokens(msg.sender, paybackAmount);
        } else {
            _token.approveToken(msg.sender, paybackAmount);
        }

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    /// @notice Uniswap V3 FL callback function that formats and calls back RecipeExecutor
    /// FLSource == UNIV3
    /// Can have fees = YES
    /// @dev Only first flash loan amount will be accessible to other recipe actions.
    function uniswapV3FlashCallback(uint256 _fee0, uint256 _fee1, bytes memory _params)
        external
        nonReentrant
    {
        FlashLoanParams memory params = abi.decode(_params, (FlashLoanParams));
        {
            uint24 fee = IUniswapV3Pool(msg.sender).fee();
            address realPool = IUniswapV3Factory(UNI_V3_FACTORY)
                .getPool(params.tokens[0], params.tokens[1], uint24(fee));
            if (msg.sender != realPool) revert UntrustedLender();
        }

        (Recipe memory currRecipe, address wallet) =
            abi.decode(params.recipeData, (Recipe, address));

        params.tokens[0].withdrawTokens(wallet, params.amounts[0]);
        params.tokens[1].withdrawTokens(wallet, params.amounts[1]);

        // DFS actions can return only one value that can be used by other actions,
        // so we limit the return value to the first flash loan amount, including any fees if present.
        uint256 pipedReturnValue = params.amounts[0] + _fee0;
        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, pipedReturnValue);

        // params.modes were used for snapshotting the starting balances of the tokens inside _flUniV3
        uint256 expectedBalance0 = params.modes[0] + params.amounts[0] + _fee0;
        uint256 expectedBalance1 = params.modes[1] + params.amounts[1] + _fee1;

        if (params.amounts[0] > 0) {
            _verifyPaybackAmount(params.tokens[0], expectedBalance0);
        }
        if (params.amounts[1] > 0) {
            _verifyPaybackAmount(params.tokens[1], expectedBalance1);
        }

        params.tokens[0].withdrawTokens(msg.sender, params.amounts[0] + _fee0);
        params.tokens[1].withdrawTokens(msg.sender, params.amounts[1] + _fee1);
    }

    /// @notice Morpho blue FL callback function that formats and calls back RecipeExecutor
    /// FLSource == MORPHO_BLUE
    /// Can have fees = NO
    function onMorphoFlashLoan(uint256 _assets, bytes calldata _data) external nonReentrant {
        if (msg.sender != MORPHO_BLUE_ADDR) {
            revert UntrustedLender();
        }
        (bytes memory recipeData, address token) = abi.decode(_data, (bytes, address));
        (Recipe memory currRecipe, address wallet) = abi.decode(recipeData, (Recipe, address));

        token.withdrawTokens(wallet, _assets);

        uint256 balanceBefore = token.getBalance(address(this));

        _executeRecipe(wallet, _getWalletType(wallet), currRecipe, _assets);

        _verifyPaybackAmount(token, _assets + balanceBefore);

        token.approveToken(MORPHO_BLUE_ADDR, _assets);
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/
    function _sendTokensToWalletAndSnapshot(
        address[] memory _tokens,
        uint256[] memory _amounts,
        address _wallet
    ) internal returns (uint256[] memory balancesBefore) {
        balancesBefore = new uint256[](_tokens.length);

        for (uint256 i = 0; i < _tokens.length; ++i) {
            _tokens[i].withdrawTokens(_wallet, _amounts[i]);
            balancesBefore[i] = _tokens[i].getBalance(address(this));
        }
    }

    function _verifyPaybackAmount(address _token, uint256 _expectedBalance) internal {
        uint256 currBalance = _token.getBalance(address(this));
        if (currBalance == _expectedBalance) return;

        // At this point, we only tolerate stETH having less than the expected balance.
        if (_token != ST_ETH_ADDR || currBalance > _expectedBalance) {
            revert WrongPaybackAmountError();
        }

        // Tolerate up to 2 wei of stETH deficit.
        uint256 deficit = _expectedBalance - currBalance;
        if (deficit > ST_ETH_PAYBACK_ROUNDING_TOLERANCE) {
            revert WrongPaybackAmountError();
        }

        // Take 2 wei of stETH to cover the rounding deficit.
        flFeeFaucet.my2Wei(ST_ETH_ADDR);

        currBalance = ST_ETH_ADDR.getBalance(address(this));

        // This means that there was not enough stETH on the faucet to cover the deficit.
        if (currBalance < _expectedBalance) revert WrongPaybackAmountError();

        // Return any excess stETH to the faucet (in practice, at most 1 wei).
        // Keeping it would not cause issues, but returning it simplifies reasoning
        // and preserves the invariant that the flash loan should not leave any dust.
        if (currBalance > _expectedBalance) {
            ST_ETH_ADDR.withdrawTokens(address(flFeeFaucet), currBalance - _expectedBalance);
            currBalance = ST_ETH_ADDR.getBalance(address(this));
        }

        if (currBalance != _expectedBalance) revert WrongPaybackAmountError();
    }
}
