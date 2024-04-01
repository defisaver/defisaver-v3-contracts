// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;


import { AaveV3CollateralSwitch } from "../../../contracts/actions/aaveV3/AaveV3CollateralSwitch.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestAaveV3CollateralSwitch is AaveV3Helper, AaveV3ExecuteActions {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3CollateralSwitch cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    
    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;
    address aaveV3SupplyContractAddr;
    
    struct TestAsset {
        address asset;
        uint16 assetId;
    }
    TestAsset[3] assets;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3CollateralSwitch");
        
        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        cut = new AaveV3CollateralSwitch();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());

        assets[0] = TestAsset({
            asset: TokenAddresses.WETH_ADDR,
            assetId: pool.getReserveData(TokenAddresses.WETH_ADDR).id
        });
        assets[1] = TestAsset({
            asset: TokenAddresses.DAI_ADDR,
            assetId: pool.getReserveData(TokenAddresses.DAI_ADDR).id
        });
        assets[2] = TestAsset({
            asset: TokenAddresses.WBTC_ADDR,
            assetId: pool.getReserveData(TokenAddresses.WBTC_ADDR).id
        });
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_switch_collateral() public {
        _supply();
        _switchCollateral(false);
    }

    function test_should_switch_collateral_direct_action_l2() public {
        _supply();
        _switchCollateral(true);
    }

    function test_empty_encoding_decoding_inputs() public {
        AaveV3CollateralSwitch.Params memory params = AaveV3CollateralSwitch.Params({
            arrayLength: 0,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET,
            assetIds: new uint16[](0),
            useAsCollateral: new bool[](0)
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs_no_market(
        uint16[1] memory _assetIds,
        bool[1] memory _useAsCollateral
    ) public {
        uint16[] memory assetIds = new uint16[](1);
        bool[] memory useAsCollateral = new bool[](1);
        assetIds[0] = _assetIds[0];
        useAsCollateral[0] = _useAsCollateral[0];

        AaveV3CollateralSwitch.Params memory params = AaveV3CollateralSwitch.Params({
            arrayLength: 1,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET,
            assetIds: assetIds,
            useAsCollateral: useAsCollateral
        });
        _assertParams(params);        
    }

    function testFuzz_encode_decode_inputs(
        uint16[3] memory _assetIds,
        bool[3] memory _useAsCollateral,
        address _market
    ) public {
        uint16[] memory assetIds = new uint16[](3);
        bool[] memory useAsCollateral = new bool[](3);
        for (uint256 i = 0; i < 3; i++) {
            assetIds[i] = _assetIds[i];
            useAsCollateral[i] = _useAsCollateral[i];
        }

        AaveV3CollateralSwitch.Params memory params = AaveV3CollateralSwitch.Params({
            arrayLength: 3,
            useDefaultMarket: false,
            market: _market,
            assetIds: assetIds,
            useAsCollateral: useAsCollateral
        });
        _assertParams(params);        
    }


    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3CollateralSwitch.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3CollateralSwitch.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.arrayLength, decodedParams.arrayLength);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.market, decodedParams.market);
        for (uint256 i = 0; i < _params.arrayLength; i++) {
            assertEq(_params.assetIds[i], decodedParams.assetIds[i]);
            assertEq(_params.useAsCollateral[i], decodedParams.useAsCollateral[i]);
        }
    }


    function _switchCollateral(bool _isL2Direct) internal {

        uint16[] memory assetIds = new uint16[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            assetIds[i] = assets[i].assetId;
        }

        bool[] memory newUseAsCollateral = new bool[](assets.length);
        newUseAsCollateral[0] = false;
        newUseAsCollateral[1] = false;
        newUseAsCollateral[2] = true;

        if (_isL2Direct) {
            AaveV3CollateralSwitch.Params memory params = AaveV3CollateralSwitch.Params({
                arrayLength: uint8(assets.length),
                useDefaultMarket: true,
                market: address(0),
                assetIds: assetIds,
                useAsCollateral: newUseAsCollateral
            });

            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        } 
        else {
            bytes memory paramsCallData = aaveV3CollateralSwitchEncode(
                uint8(assets.length),
                assetIds,
                newUseAsCollateral,
                true,
                address(0)
            );
            
            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3CollateralSwitch.executeAction.selector,
                paramsCallData,
                subData,
                paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);
        }

        bool[] memory useAsCollateralAfter = new bool[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            (,,,,,,,,bool useAsCollateral) = dataProvider.getUserReserveData(assets[i].asset, walletAddr);
            useAsCollateralAfter[i] = useAsCollateral;
        }

        for (uint256 i = 0; i < assets.length; i++) {
            assertEq(useAsCollateralAfter[i], newUseAsCollateral[i]);
        }
    }

    function _supply() internal {
        for (uint256 i = 0; i < assets.length; ++i) {
            TestAsset memory a = assets[i];
            AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
                amount: amountInUSDPrice(a.asset, 10_000),
                from: sender,
                assetId: a.assetId,
                enableAsColl: true,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            executeAaveV3Supply(supplyParams, a.asset, wallet, false, aaveV3SupplyContractAddr);    
        }
    }
}
