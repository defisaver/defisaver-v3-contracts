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
import "../../interfaces/euler/IEulerMarkets.sol";
import "../../interfaces/euler/IDToken.sol";

import "../../core/strategy/StrategyModel.sol";

import "./helpers/FLHelper.sol";

/// @title Action that gets and receives FL from different variety of sources
contract FLAction is ActionBase, ReentrancyGuard, IFlashLoanBase, StrategyModel, FLHelper {
    using TokenUtils for address;

    /// @dev FL Initiator must be this contract
    error UntrustedInitiator();
    /// @dev Caller in these functions must be relevant FL source address
    error UntrustedLender();

    error WrongPaybackAmountError(); // Wrong FL payback amount sent

    error NonexistentFLSource();

    enum FLSource {
        EMPTY,
        AAVE,
        BALANCER,
        EULER,
        MAKER
    }

    /// @dev Function sig of RecipeExecutor._executeActionsFromFL()
    bytes4 public constant CALLBACK_SELECTOR =
        bytes4(
            keccak256(
                "_executeActionsFromFL((string,bytes[],bytes32[],bytes4[],uint8[][]),bytes32)"
            )
        );
    bytes4 public constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

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
        if (_source == FLSource.AAVE) {
            _flAave(_flParams);
        } else if (_source == FLSource.BALANCER) {
            _flBalancer(_flParams);
        } else if (_source == FLSource.EULER) {
            _flEuler(_flParams);
        } else if (_source == FLSource.MAKER) {
            _flMaker(_flParams);
        } else {
            revert NonexistentFLSource();
        }
    }

    /// @notice Gets a Fl from Aave and returns back the execution to the action address
    /// @param _flParams All the amounts/tokens and related aave fl data
    function _flAave(FlashLoanParams memory _flParams) internal {
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
                "AAVE",
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

    function _flEuler(FlashLoanParams memory _flParams) internal {
        IDToken dToken = IDToken(
            IEulerMarkets(EULER_MARKET_ADDR).underlyingToDToken(_flParams.tokens[0])
        );
        bytes memory passingData = abi.encode(
            _flParams.tokens[0].getBalance(address(this)),
            _flParams.amounts[0],
            _flParams.tokens[0],
            _flParams.recipeData
        );
        dToken.flashLoan(_flParams.amounts[0], passingData);

        emit ActionEvent("FLAction", abi.encode("EULER", _flParams.amounts[0]));
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

    /// @notice Aave callback function that formats and calls back RecipeExecutor
    /// FLSource == AAVE
    function executeOperation(
        address[] memory _assets,
        uint256[] memory _amounts,
        uint256[] memory _fees,
        address _initiator,
        bytes memory _params
    ) public nonReentrant returns (bool) {
        if (msg.sender != AAVE_LENDING_POOL) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory currRecipe, address proxy) = abi.decode(_params, (Recipe, address));
        uint256[] memory balancesBefore = new uint256[](_assets.length);
        // Send FL amounts to user proxy
        for (uint256 i = 0; i < _assets.length; ++i) {
            _assets[i].withdrawTokens(proxy, _amounts[i]);
            balancesBefore[i] = _assets[i].getBalance(address(this));
        }

        address payable recipeExecutor = payable(registry.getAddr(RECIPE_EXECUTOR_ID));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutor,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, bytes32(_amounts[0] + _fees[0]))
        );

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

            _assets[i].approveToken(address(AAVE_LENDING_POOL), paybackAmount);
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
        (Recipe memory currRecipe, address proxy) = abi.decode(_userData, (Recipe, address));

        uint256[] memory balancesBefore = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; i++) {
            _tokens[i].withdrawTokens(proxy, _amounts[i]);
            balancesBefore[i] = _tokens[i].getBalance(address(this));
        }
        address payable recipeExecutorAddr = payable(registry.getAddr(bytes4(RECIPE_EXECUTOR_ID)));

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, _amounts[0] +_feeAmounts[0])
        );

        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 paybackAmount = _amounts[i] + (_feeAmounts[i]);

            if (_tokens[i].getBalance(address(this)) != paybackAmount + balancesBefore[i]) {
                revert WrongPaybackAmountError();
            }

            _tokens[i].withdrawTokens(address(VAULT_ADDR), paybackAmount);
        }
    }

    /// @notice Euler callback function that formats and calls back RecipeExecutor
    /// FLSource = EULER
    function onFlashLoan(bytes calldata _data) external nonReentrant {
        (uint256 balanceBefore, uint256 amount, address token, bytes memory recipeData) = abi
            .decode(_data, (uint256, uint256, address, bytes));

        if (msg.sender != EULER_ADDR) {
            revert UntrustedLender();
        }

        (Recipe memory currRecipe, address proxy) = abi.decode(recipeData, (Recipe, address));
        address payable recipeExecutorAddr = payable(registry.getAddr(RECIPE_EXECUTOR_ID));
        token.withdrawTokens(proxy, amount);

        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, amount)
        );
        bool isCorrectAmount = token.getBalance(address(this)) == amount + balanceBefore;

        if (token == ST_ETH_ADDR && !isCorrectAmount) {
            flFeeFaucet.my2Wei(ST_ETH_ADDR);
            isCorrectAmount = true;
        }

        if (!isCorrectAmount) {
            revert WrongPaybackAmountError();
        }

        token.withdrawTokens(msg.sender, amount);
    }

    /// @notice ERC3156 callback function that formats and calls back RecipeExecutor
    /// FLSource == MAKER
    function onFlashLoan(
        address _initiator,
        address _token,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _data
    ) external nonReentrant returns (bytes32) {
        if (msg.sender != DSS_FLASH_ADDR) {
            revert UntrustedLender();
        }
        if (_initiator != address(this)) {
            revert UntrustedInitiator();
        }

        (Recipe memory currRecipe, address proxy) = abi.decode(_data, (Recipe, address));
        _token.withdrawTokens(proxy, _amount);
        uint256 balanceBefore = _token.getBalance(address(this));

        address payable recipeExecutorAddr = payable(registry.getAddr(bytes4(RECIPE_EXECUTOR_ID)));

        uint256 paybackAmount = _amount +_fee;
        // call Action execution
        IDSProxy(proxy).execute{value: address(this).balance}(
            recipeExecutorAddr,
            abi.encodeWithSelector(CALLBACK_SELECTOR, currRecipe, paybackAmount)
        );
        if (_token.getBalance(address(this)) != paybackAmount + balanceBefore) {
            revert WrongPaybackAmountError();
        }

        _token.approveToken(DSS_FLASH_ADDR, paybackAmount);

        return keccak256("ERC3156FlashBorrower.onFlashLoan");
    }
}
