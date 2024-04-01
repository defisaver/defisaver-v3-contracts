// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";

import "../../utils/ReentrancyGuard.sol";
import "../../utils/TokenUtils.sol";

import "../../interfaces/IDSProxy.sol";
import "../../interfaces/flashloan/IFlashLoanBase.sol";
import "../../interfaces/flashloan/IERC3156FlashLender.sol";
import "../../interfaces/flashloan/IERC3156FlashBorrower.sol";
import "../../interfaces/aaveV2/ILendingPoolV2.sol";
import "../../interfaces/balancer/IFlashLoans.sol";
import "../../interfaces/uniswap/v3/IUniswapV3Pool.sol";
import "../../interfaces/uniswap/v3/IUniswapV3Factory.sol";
import "../../interfaces/morpho-blue/IMorphoBlue.sol";
import "../../core/helpers/CoreHelper.sol";

import "./helpers/FLHelper.sol";

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

    enum FLSource {
        EMPTY,
        AAVEV2,
        BALANCER,
        GHO,
        MAKER,
        AAVEV3,
        UNIV3,
        SPARK,
        MORPHO_BLUE
    }

    /// @inheritdoc ActionBase
    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.FL_ACTION);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {}

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

        handleFlashloan(params, flSource);

        return bytes32(params.amounts[0]);
    }

    function handleFlashloan(FlashLoanParams memory _flParams, FLSource _source) internal {
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
        } else {
            revert NonexistentFLSource();
        }
    }

    /// @notice Gets a Fl from Aave and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
    function _flAaveV2(FlashLoanParams memory _flParams) internal {
        ILendingPoolV2(AAVE_LENDING_POOL).flashLoan(
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
                "AAVEV2",
                _flParams.tokens,
                _flParams.amounts,
                _flParams.modes,
                _flParams.onBehalfOf
            )
        );
    }

    /// @notice Gets a Fl from Aave V3 and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
    function _flAaveV3(FlashLoanParams memory _flParams) internal {
        ILendingPoolV2(AAVE_V3_LENDING_POOL).flashLoan(
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
                "AAVEV3",
                _flParams.tokens,
                _flParams.amounts,
                _flParams.modes,
                _flParams.onBehalfOf
            )
        );
    }

    /// @notice Gets a FL from Balancer and returns back the execution to the action address
    function _flBalancer(FlashLoanParams memory _flParams) internal {
        IFlashLoans(VAULT_ADDR).flashLoan(
            address(this),
            _flParams.tokens,
            _flParams.amounts,
            _flParams.recipeData
        );

        emit ActionEvent("FLAction", abi.encode("BALANCER", _flParams));
    }

    /// @notice Gets a GHO FL from Gho Flash Minter
    function _flGho(FlashLoanParams memory _flParams) internal {
        IERC3156FlashLender(GHO_FLASH_MINTER_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            GHO_ADDR,
            _flParams.amounts[0],
            _flParams.recipeData
        );

        emit ActionEvent("FLAction", abi.encode("GHO", _flParams.amounts[0]));
    }

    /// @notice Gets a DAI flash loan from Maker and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
    function _flMaker(FlashLoanParams memory _flParams) internal {
        IERC3156FlashLender(DSS_FLASH_ADDR).flashLoan(
            IERC3156FlashBorrower(address(this)),
            DAI_ADDR,
            _flParams.amounts[0],
            _flParams.recipeData
        );

        emit ActionEvent("FLAction", abi.encode("MAKER", _flParams.amounts[0]));
    }

    function _flUniV3(FlashLoanParams memory _flParams) internal {
        // modes aren't used so we set them to later know starting balances
        _flParams.modes = new uint256[](2);
        _flParams.modes[0] = _flParams.amounts[0] > 0 ? _flParams.tokens[0].getBalance(address(this)) : 0;
        _flParams.modes[1] = _flParams.amounts[1] > 0 ? _flParams.tokens[1].getBalance(address(this)) : 0;

        /// @dev FlashLoanParams.tokens, first two array indexes contain tokens, third index contains pool address
        IUniswapV3Pool(_flParams.tokens[2]).flash(
            address(this),
            _flParams.amounts[0],
            _flParams.amounts[1],
            abi.encode(_flParams)
        );

        emit ActionEvent("FLAction", abi.encode("UNIV3", _flParams.amounts[0]));
    }

    /// @notice Gets a Fl from Spark and returns back the execution to the action address
    function _flSpark(FlashLoanParams memory _flParams) internal {

        ILendingPoolV2(SPARK_LENDING_POOL).flashLoan(
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
    function _flMorphoBlue(FlashLoanParams memory _params) internal {
        IMorphoBlue(MORPHO_BLUE_ADDR).flashLoan(
            _params.tokens[0],
            _params.amounts[0],
            abi.encode(_params.recipeData, _params.tokens[0])
        );

        emit ActionEvent("FLAction", abi.encode("MORPHOBLUE", _params.amounts[0]));
    }

    /// @notice Aave callback function that formats and calls back RecipeExecutor
    /// FLSource == AAVE | SPARK
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (msg.sender != AAVE_LENDING_POOL && msg.sender != AAVE_V3_LENDING_POOL && msg.sender != SPARK_LENDING_POOL) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory currRecipe, address wallet) = abi.decode(_params, (Recipe, address));
        uint256[] memory balancesBefore = new uint256[](_assets.length);
        // Send FL amounts to user wallet
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(wallet, _amounts[i]);
            balancesBefore[i] = _assets[i].getBalance(address(this));
        }

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, _amounts[0] + _fees[0]);

        // return FL
        for (uint256 i = 0; i < _assets.length; i++) {
            uint256 paybackAmount = _amounts[i] + _fees[i];
            bool correctAmount = _assets[i].getBalance(address(this)) ==
                paybackAmount + balancesBefore[i];

            if (_assets[i] == ST_ETH_ADDR && !correctAmount) {
                flFeeFaucet.my2Wei(ST_ETH_ADDR);
                correctAmount = true;
            }
            if (!correctAmount) {
                revert WrongPaybackAmountError();
            }

            _assets[i].approveToken(address(msg.sender), paybackAmount);
        }

        return true;
    }

    /// @notice Balancer FL callback function that formats and calls back RecipeExecutor
    /// FLSource == BALANCER
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

        uint256[] memory balancesBefore = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].withdrawTokens(wallet, _amounts[i]);
            balancesBefore[i] = _tokens[i].getBalance(address(this));
        }

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, _amounts[0] + _feeAmounts[0]);
        
        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i] + (_feeAmounts[i]);

            if (_tokens[i].getBalance(address(this)) != paybackAmount + balancesBefore[i]) {
                revert WrongPaybackAmountError();
            }

            _tokens[i].withdrawTokens(address(VAULT_ADDR), paybackAmount);
        }
    }

    /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
    /// FLSource == MAKER | GHO
    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external nonReentrant returns (bytes32) {
        if (msg.sender != DSS_FLASH_ADDR && msg.sender != GHO_FLASH_MINTER_ADDR) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory currRecipe, address wallet) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(wallet, _amount);
        uint256 balanceBefore = _token.getBalance(address(this));

        uint256 paybackAmount = _amount +_fee;

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, paybackAmount);

        if (_token.getBalance(address(this)) != paybackAmount + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        _token.approveToken(msg.sender, paybackAmount);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }

    function uniswapV3FlashCallback(
        uint256 _fee0,
        uint256 _fee1,
        bytes memory _params
    ) external nonReentrant {
        FlashLoanParams memory params = abi.decode(_params, (FlashLoanParams));
        {
            uint24 fee = IUniswapV3Pool(msg.sender).fee();
            address realPool = IUniswapV3Factory(UNI_V3_FACTORY).getPool(params.tokens[0], params.tokens[1], uint24(fee));
            if (msg.sender != realPool) revert UntrustedLender();
        }

        (Recipe memory currRecipe, address wallet) = abi.decode(params.recipeData, (Recipe, address));

        params.tokens[0].withdrawTokens(wallet, params.amounts[0]);
        params.tokens[1].withdrawTokens(wallet, params.amounts[1]);

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, params.amounts[0]);

        uint256 expectedBalance0 = params.modes[0] + params.amounts[0] + _fee0;
        uint256 expectedBalance1 = params.modes[1] + params.amounts[1] + _fee1;

        uint256 currBalance0 = params.amounts[0] > 0 ? params.tokens[0].getBalance(address(this)) : 0;
        uint256 currBalance1 = params.amounts[1] > 0 ? params.tokens[1].getBalance(address(this)) : 0;

        bool isCorrectAmount0 = currBalance0 == expectedBalance0;
        bool isCorrectAmount1 = currBalance1 == expectedBalance1;

        if (params.amounts[0] > 0 && params.tokens[0] == ST_ETH_ADDR && !isCorrectAmount0) {
            flFeeFaucet.my2Wei(ST_ETH_ADDR);
            isCorrectAmount0 = true;
        }
        if (params.amounts[1] > 0 && params.tokens[1] == ST_ETH_ADDR && !isCorrectAmount1) {
            flFeeFaucet.my2Wei(ST_ETH_ADDR);
            isCorrectAmount1 = true;
        }

        if (!isCorrectAmount0) revert WrongPaybackAmountError();
        if (!isCorrectAmount1) revert WrongPaybackAmountError();

        params.tokens[0].withdrawTokens(msg.sender, params.amounts[0] + _fee0);
        params.tokens[1].withdrawTokens(msg.sender, params.amounts[1] + _fee1);
    }

    function onMorphoFlashLoan(uint256 assets, bytes calldata data) external nonReentrant{
        if (msg.sender != MORPHO_BLUE_ADDR) {
            revert UntrustedLender();
        }
        (bytes memory taskData, address token) = abi.decode(data, (bytes, address));
        (Recipe memory currRecipe, address wallet) = abi.decode(taskData, (Recipe, address));

        token.withdrawTokens(wallet, assets);

        uint256 balanceBefore = token.getBalance(address(this));

        _executeRecipe(wallet, isDSProxy(wallet), currRecipe, assets);

        if (token.getBalance(address(this)) != assets + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        token.approveToken(MORPHO_BLUE_ADDR, assets);
    }
}
