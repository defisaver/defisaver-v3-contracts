// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPoolV3 } from "../../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { RecipeExecutor } from "../../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { FLAction } from "../../../contracts/actions/flashloan/FLAction.sol";
import {
    MainnetFLAddresses
} from "../../../contracts/actions/flashloan/helpers/MainnetFLAddresses.sol";
import { SendToken } from "../../../contracts/actions/utils/SendToken.sol";
import { SendTokens } from "../../../contracts/actions/utils/SendTokens.sol";
import {
    IERC3156FlashLender
} from "../../../contracts/interfaces/flashloan/IERC3156FlashLender.sol";
import { IFlashLoanBase } from "../../../contracts/interfaces/flashloan/IFlashLoanBase.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { IWETH } from "../../../contracts/interfaces/token/IWETH.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { RegistryUtils } from "../../utils/RegistryUtils.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

abstract contract FLActionTestBase is ActionsUtils, RegistryUtils, BaseTest, MainnetFLAddresses {
    /*//////////////////////////////////////////////////////////////////////////
                                     VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    FLAction internal flAction;
    RecipeExecutor internal recipeExecutor;
    SmartWallet internal wallet;

    address internal flActionAddr;
    address internal walletAddr;

    address internal constant DAI_USDC_UNI_V3_POOL = 0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168;
    address internal constant WBTC_WETH_UNI_V3_POOL = 0x4585FE77225b41b697C938B018E2Ac67Ac5a20c0;
    address internal constant BOLD_ADDR = 0x6440f144b7e50D6a8439336510312d2F54beB01D;
    uint256 internal constant PRE_EXISTING_FL_ACTION_BALANCE = 1;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public virtual override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        wallet.createSafe();
        walletAddr = wallet.walletAddr();

        recipeExecutor = new RecipeExecutor();
        flAction = new FLAction();
        flActionAddr = address(flAction);

        redeploy("RecipeExecutor", address(recipeExecutor));
        redeploy("FLAction", flActionAddr);
        redeploy("SendToken", address(new SendToken()));
        redeploy("SendTokens", address(new SendTokens()));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeRecipe(StrategyModel.Recipe memory _recipe) internal {
        wallet.execute(
            address(recipeExecutor),
            abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, _recipe),
            0
        );
    }

    function _createRecipe(
        string memory _name,
        bytes[] memory _actionsCalldata,
        bytes4[] memory _actionIds
    ) internal pure returns (StrategyModel.Recipe memory recipe) {
        uint8[][] memory paramMap = new uint8[][](_actionIds.length);
        for (uint256 i = 0; i < _actionIds.length; ++i) {
            paramMap[i] = new uint8[](MAX_PARAM_MAPPING_SIZE);
        }

        recipe = StrategyModel.Recipe({
            name: _name,
            callData: _actionsCalldata,
            subData: new bytes32[](0),
            actionIds: _actionIds,
            paramMapping: paramMap
        });
    }

    function _singleTokenFLRecipe(
        string memory _name,
        address _token,
        uint256 _amount,
        FLSource _source
    ) internal view returns (StrategyModel.Recipe memory recipe) {
        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = flActionEncode(_token, _amount, _source);
        actionsCalldata[1] = sendTokenEncode(_token, flActionAddr, type(uint256).max);

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendToken"));

        recipe = _createRecipe(_name, actionsCalldata, actionIds);
    }

    function _uniV3FLRecipe(
        address _token0,
        address _token1,
        address _pool,
        uint256 _amount0,
        uint256 _amount1
    ) internal view returns (StrategyModel.Recipe memory recipe) {
        address[] memory tokens = new address[](2);
        tokens[0] = _token0;
        tokens[1] = _token1;

        address[] memory receivers = new address[](2);
        receivers[0] = flActionAddr;
        receivers[1] = flActionAddr;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = type(uint256).max;
        amounts[1] = type(uint256).max;

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = flUniswapEncode(_token0, _token1, _pool, _amount0, _amount1);
        actionsCalldata[1] = abi.encode(
            SendTokens.Params({ tokens: tokens, receivers: receivers, amounts: amounts })
        );

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendTokens"));

        recipe = _createRecipe("UniV3FLRecipe", actionsCalldata, actionIds);
    }

    function _balancerFLRecipe(address[] memory _tokens, uint256[] memory _amounts)
        internal
        view
        returns (StrategyModel.Recipe memory recipe)
    {
        address[] memory receivers = new address[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; ++i) {
            receivers[i] = flActionAddr;
        }

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _flActionEncode(_tokens, _amounts, FLSource.BALANCER);
        actionsCalldata[1] = abi.encode(
            SendTokens.Params({ tokens: _tokens, receivers: receivers, amounts: _amounts })
        );

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendTokens"));

        recipe = _createRecipe("BalancerFLRecipe", actionsCalldata, actionIds);
    }

    function _balancerV3FLRecipe(address[] memory _tokens, uint256[] memory _amounts)
        internal
        view
        returns (StrategyModel.Recipe memory recipe)
    {
        address[] memory receivers = new address[](_tokens.length);
        uint256[] memory amounts = new uint256[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; ++i) {
            receivers[i] = flActionAddr;
            amounts[i] = type(uint256).max;
        }

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _flActionEncode(_tokens, _amounts, FLSource.BALANCER_V3);
        actionsCalldata[1] = abi.encode(
            SendTokens.Params({ tokens: _tokens, receivers: receivers, amounts: amounts })
        );

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendTokens"));

        recipe = _createRecipe("BalancerV3FLRecipe", actionsCalldata, actionIds);
    }

    function _morphoBlueFLRecipe(address _token, uint256 _amount)
        internal
        view
        returns (StrategyModel.Recipe memory recipe)
    {
        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _flActionEncode(_token, _amount, FLSource.MORPHO_BLUE);
        actionsCalldata[1] = sendTokenEncode(_token, flActionAddr, _amount);

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendToken"));

        recipe = _createRecipe("MorphoBlueFLRecipe", actionsCalldata, actionIds);
    }

    function _flActionEncode(address _token, uint256 _amount, FLSource _source)
        internal
        pure
        returns (bytes memory)
    {
        address[] memory tokens = new address[](1);
        tokens[0] = _token;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;

        return _flActionEncode(tokens, amounts, _source);
    }

    function _flActionEncode(address[] memory _tokens, uint256[] memory _amounts, FLSource _source)
        internal
        pure
        returns (bytes memory)
    {
        uint256[] memory modes = new uint256[](0);
        if (_source == FLSource.AAVEV2 || _source == FLSource.AAVEV3 || _source == FLSource.SPARK) {
            modes = new uint256[](_amounts.length);
        }

        IFlashLoanBase.FlashLoanParams memory params = IFlashLoanBase.FlashLoanParams({
            tokens: _tokens,
            amounts: _amounts,
            modes: modes,
            onBehalfOf: address(0),
            flParamGetterAddr: address(0),
            flParamGetterData: abi.encodePacked(uint8(_source)),
            recipeData: ""
        });

        return abi.encode(params);
    }

    function _giveFeeAndDust(address _token, uint256 _feeAmount) internal {
        _giveToken(_token, walletAddr, _feeAmount);
        _giveToken(_token, flActionAddr, PRE_EXISTING_FL_ACTION_BALANCE);
    }

    function _giveToken(address _token, address _to, uint256 _amount) internal {
        if (_token == Addresses.WETH_ADDR) {
            vm.deal(address(this), _amount);
            IWETH(Addresses.WETH_ADDR).deposit{ value: _amount }();
            IERC20(Addresses.WETH_ADDR).transfer(_to, _amount);
            return;
        }

        give(_token, _to, _amount);
    }

    function _aaveV3Fee(uint256 _amount) internal view returns (uint256) {
        uint256 premiumBps = IPoolV3(AAVE_V3_LENDING_POOL).FLASHLOAN_PREMIUM_TOTAL();
        return (_amount * premiumBps + 9999) / 10_000;
    }

    function _aaveV2Fee(uint256 _amount) internal pure returns (uint256) {
        return (_amount * 9 + 9999) / 10_000;
    }

    function _sparkFee(uint256 _amount) internal view returns (uint256) {
        uint256 premiumBps = IPoolV3(SPARK_LENDING_POOL).FLASHLOAN_PREMIUM_TOTAL();
        return (_amount * premiumBps + 9999) / 10_000;
    }

    function _erc3156Fee(address _lender, address _token, uint256 _amount)
        internal
        view
        returns (uint256)
    {
        return IERC3156FlashLender(_lender).flashFee(_token, _amount);
    }

    function _uniV3Fee(uint256 _amount, uint256 _fee) internal pure returns (uint256) {
        return (_amount * _fee + 1e6 - 1) / 1e6;
    }

    function _assertNoBalanceChange(address _token, uint256 _balanceBefore) internal view {
        assertEq(IERC20(_token).balanceOf(flActionAddr), _balanceBefore);
    }

    function _sortTokens(address _tokenA, address _tokenB, uint256 _amountA, uint256 _amountB)
        internal
        pure
        returns (address[] memory tokens, uint256[] memory amounts)
    {
        tokens = new address[](2);
        amounts = new uint256[](2);

        if (_tokenA < _tokenB) {
            tokens[0] = _tokenA;
            tokens[1] = _tokenB;
            amounts[0] = _amountA;
            amounts[1] = _amountB;
        } else {
            tokens[0] = _tokenB;
            tokens[1] = _tokenA;
            amounts[0] = _amountB;
            amounts[1] = _amountA;
        }
    }
}
