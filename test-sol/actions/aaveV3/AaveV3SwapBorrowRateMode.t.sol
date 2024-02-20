// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3SwapBorrowRateMode } from "../../../contracts/actions/aaveV3/AaveV3SwapBorrowRateMode.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3CdpCreator, DataTypes } from "../../utils/cdp/AaveV3CdpCreator.sol";
import { console } from "forge-std/console.sol";
 
/// @dev Borrowing with stable rate is currenlty paused on Aave V3
/// @dev In this test we just skip main logic for action execution and test encoding and decoding
contract TestAaveV3SwapBorrowRateMode is AaveV3CdpCreator {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3SwapBorrowRateMode cut;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3SwapBorrowRateMode");
        SmartWallet.setUp();
        AaveV3CdpCreator.setUp();
        cut = new AaveV3SwapBorrowRateMode();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_weth_with_variable_rate_then_swap_to_stable_rate() public {
        createAaveV3Cdp(
            CdpParams({
                collAddr: TokenAddresses.WETH_ADDR,
                collAmount: amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000),
                debtAddr: TokenAddresses.DAI_ADDR,
                debtAmount: amountInUSDPrice(TokenAddresses.DAI_ADDR, 40_000)
            })
        );
        
        bool isL2Direct = false;
        _switchRateMode(TokenAddresses.DAI_ADDR, isL2Direct);
    }

    function testFuzz_encode_decode_inputs_no_market(
        uint256 _rateMode,
        uint16 _assetId
    ) public {
        AaveV3SwapBorrowRateMode.Params memory params = AaveV3SwapBorrowRateMode.Params({
            rateMode: _rateMode, 
            assetId: _assetId,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(
        uint256 _rateMode,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3SwapBorrowRateMode.Params memory params = AaveV3SwapBorrowRateMode.Params({
            rateMode: _rateMode, 
            assetId: _assetId,
            useDefaultMarket: false,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                    HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3SwapBorrowRateMode.Params memory _params) internal {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3SwapBorrowRateMode.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.rateMode, decodedParams.rateMode);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.market, decodedParams.market);
    }

    function _switchRateMode(address _debtAddr, bool _isL2Direct) internal {
        DataTypes.ReserveData memory daiData = pool.getReserveData(_debtAddr);

        (,,,,,,,bool stableBorrowingEnabled,,) = dataProvider.getReserveConfigurationData(_debtAddr);
        if (!stableBorrowingEnabled) {
            console.log("Stable borrowing is not enabled. Skipping test...");
            return;
        }

        uint256 variableDaiTokenBalanceBefore = balanceOf(daiData.variableDebtTokenAddress, walletAddr);
        uint256 stableDaiTokenBalanceBefore = balanceOf(daiData.stableDebtTokenAddress, walletAddr);
        
        if (_isL2Direct) {
            AaveV3SwapBorrowRateMode.Params memory params = AaveV3SwapBorrowRateMode.Params({
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: daiData.id,
                useDefaultMarket: true,
                market: address(0)
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3SwapBorrowRateModeEncode(
                uint8(DataTypes.InterestRateMode.VARIABLE),
                daiData.id,
                true,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3SwapBorrowRateMode.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 variableDaiTokenBalanceAfter = balanceOf(daiData.variableDebtTokenAddress, walletAddr);
        uint256 stableDaiTokenBalanceAfter = balanceOf(daiData.stableDebtTokenAddress, walletAddr);

        console.log("variableDaiTokenBalanceBefore", variableDaiTokenBalanceBefore);
        console.log("variableDaiTokenBalanceAfter", variableDaiTokenBalanceAfter);
        console.log("stableDaiTokenBalanceBefore", stableDaiTokenBalanceBefore);
        console.log("stableDaiTokenBalanceAfter", stableDaiTokenBalanceAfter);
    }
}
