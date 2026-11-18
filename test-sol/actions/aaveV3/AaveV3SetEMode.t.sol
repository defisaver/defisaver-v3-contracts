// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV3SetEMode } from "../../../contracts/actions/aaveV3/AaveV3SetEMode.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3TestHelper } from "../../utils/aaveV3/AaveV3TestHelper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/protocols/aaveV3/IL2PoolV3.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";

import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";
import { AaveV3Encode } from "../../utils/encode/AaveV3Encode.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV3SetEMode is AaveV3TestHelper, AaveV3ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3SetEMode cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    IL2PoolV3 pool;
    address aaveV3SupplyContractAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("AaveV3SetEMode");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3SetEMode();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_change_eMode() public {
        address token = Addresses.WETH_ADDR;
        uint256 supplyAmount = amountInUSDPrice(token, 100_000);
        if (!_validSupplyExecuted(token, supplyAmount, walletAddr)) return;

        uint8 ethCorrelatedCategoryId = 1;
        uint8[] memory newParamMapping = new uint8[](2);

        _setEMode(ethCorrelatedCategoryId, false, address(0), walletAddr, newParamMapping);
    }

    function test_should_change_eMode_l2_direct() public {
        address token = Addresses.WETH_ADDR;
        uint256 supplyAmount = amountInUSDPrice(token, 100_000);
        if (!_validSupplyExecuted(token, supplyAmount, walletAddr)) return;

        uint8 ethCorrelatedCategoryId = 1;

        _setEMode(ethCorrelatedCategoryId, true, walletAddr, walletAddr, new uint8[](0));
    }

    function test_should_change_eMode_on_behalf() public {
        address token = Addresses.WETH_ADDR;
        uint256 supplyAmount = amountInUSDPrice(token, 100_000);
        if (!_validSupplyExecuted(token, supplyAmount, sender)) return;

        _approveWalletAsPositionManager();

        uint8 ethCorrelatedCategoryId = 1;
        uint8[] memory onBehalfParamMapping = new uint8[](2);
        onBehalfParamMapping[1] = 255; // map onBehalf to EOA owner

        _setEMode(ethCorrelatedCategoryId, false, address(0), sender, onBehalfParamMapping);
    }

    function test_should_change_eMode_on_behalf_l2_direct() public {
        address token = Addresses.WETH_ADDR;
        uint256 supplyAmount = amountInUSDPrice(token, 100_000);
        if (!_validSupplyExecuted(token, supplyAmount, sender)) return;

        _approveWalletAsPositionManager();

        uint8 ethCorrelatedCategoryId = 1;
        _setEMode(ethCorrelatedCategoryId, true, sender, sender, new uint8[](0));
    }

    function test_should_change_eMode_with_legacy_param_mapping() public {
        address token = Addresses.WETH_ADDR;
        uint256 supplyAmount = amountInUSDPrice(token, 100_000);
        if (!_validSupplyExecuted(token, supplyAmount, walletAddr)) return;

        uint8 ethCorrelatedCategoryId = 1;
        uint8[] memory legacyParamMapping = new uint8[](1);

        _setEMode(ethCorrelatedCategoryId, false, address(0), walletAddr, legacyParamMapping);
    }

    function testFuzz_encode_decode_inputs_no_market(uint8 _categoryId, address _onBehalf)
        public
        view
    {
        AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
            categoryId: _categoryId,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET,
            onBehalf: _onBehalf
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(uint8 _categoryId, address _market, address _onBehalf)
        public
        view
    {
        AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
            categoryId: _categoryId, useDefaultMarket: false, market: _market, onBehalf: _onBehalf
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3SetEMode.Params memory _params) private view {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3SetEMode.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);

        assertEq(decodedParams.categoryId, _params.categoryId);
        assertEq(decodedParams.useDefaultMarket, _params.useDefaultMarket);
        assertEq(decodedParams.market, _params.market);
        assertEq(decodedParams.onBehalf, _params.onBehalf);
    }

    function _setEMode(
        uint8 _categoryId,
        bool _isL2Direct,
        address _onBehalf,
        address _expectedPositionOwner,
        uint8[] memory _paramMapping
    ) internal {
        address otherPositionOwner = _expectedPositionOwner == walletAddr ? sender : walletAddr;
        uint256 categoryIdBefore = pool.getUserEMode(_expectedPositionOwner);
        uint256 otherCategoryIdBefore = pool.getUserEMode(otherPositionOwner);

        if (_isL2Direct) {
            AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
                categoryId: _categoryId,
                useDefaultMarket: true,
                market: address(0),
                onBehalf: _onBehalf
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        } else {
            bytes memory paramsCalldata =
                AaveV3Encode.setEMode(_categoryId, true, address(0), _onBehalf);

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3SetEMode.executeAction.selector,
                paramsCalldata,
                subData,
                _paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 categoryIdAfter = pool.getUserEMode(_expectedPositionOwner);
        uint256 otherCategoryIdAfter = pool.getUserEMode(otherPositionOwner);

        assertEq(categoryIdBefore, 0);
        assertEq(categoryIdAfter, _categoryId);
        assertEq(otherCategoryIdAfter, otherCategoryIdBefore);
    }

    function _approveWalletAsPositionManager() internal {
        vm.prank(sender);
        pool.approvePositionManager(walletAddr, true);
    }

    function _validSupplyExecuted(address _token, uint256 _amount, address _onBehalf)
        internal
        returns (bool)
    {
        if (!isValidSupply(DEFAULT_AAVE_MARKET, _token, _amount)) {
            console2.log(
                "[AaveV3SetEMode] Can't supply asset (check cap and flags). Skipping test..."
            );
            return false;
        }

        DataTypes.ReserveData memory tokenData = pool.getReserveData(_token);
        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _amount,
            from: sender,
            assetId: tokenData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: _onBehalf != walletAddr,
            market: address(0),
            onBehalf: _onBehalf
        });

        executeAaveV3Supply(supplyParams, _token, wallet, false, aaveV3SupplyContractAddr);
        return true;
    }
}
