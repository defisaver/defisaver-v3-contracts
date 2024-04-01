// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Withdraw } from "../../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";

contract TestAaveV3Withdraw is AaveV3Helper, AaveV3ExecuteActions {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Withdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;
    address aaveV3SupplyContractAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3Withdraw");
        initTestPairs("AaveV3");
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3Withdraw();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_part_of_collateral() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            address tokenAddr = testPairs[i].supplyAsset;
            uint256 supplyAmount = amountInUSDPrice(tokenAddr, 100_000);
            _supply(tokenAddr, supplyAmount);

            uint256 withdrawAmount = amountInUSDPrice(tokenAddr, 50_000);
            bool isL2Direct = false;
            _withdraw(tokenAddr, withdrawAmount, isL2Direct);
        }
    }

    function test_should_withdraw_all_supplied_collateral() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            address tokenAddr = testPairs[i].supplyAsset;
            uint256 supplyAmount = amountInUSDPrice(tokenAddr, 100_000);
            _supply(tokenAddr, supplyAmount);

            uint256 withdrawAmount = type(uint256).max;
            bool isL2Direct = false;
            _withdraw(tokenAddr, withdrawAmount, isL2Direct);
        }
    }

    function test_should_withdraw_part_of_supplied_collateral_l2_direct() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            address tokenAddr = testPairs[i].supplyAsset;
            uint256 supplyAmount = amountInUSDPrice(tokenAddr, 100_000);
            _supply(tokenAddr, supplyAmount);

            uint256 withdrawAmount = amountInUSDPrice(tokenAddr, 50_000);
            bool isL2Direct = true;
            _withdraw(tokenAddr, withdrawAmount, isL2Direct);
        }
    }

    function testFuzz_encode_decode_no_market(
        uint16 _assetId,
        uint256 _amount,
        address _to
    ) public {
        AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
            assetId: _assetId,
            useDefaultMarket: true,
            amount: _amount,
            to: _to,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode(
        uint16 _assetId,
        uint256 _amount,
        address _to,
        address _market
    ) public {
        AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
            assetId: _assetId,
            useDefaultMarket: false,
            amount: _amount,
            to: _to,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3Withdraw.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3Withdraw.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.to, decodedParams.to);
        assertEq(_params.market, decodedParams.market);
    }

    function _withdraw(address _token, uint256 _amount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory tokenData = pool.getReserveData(_token);

        uint256 senderBalanceBefore = balanceOf(_token, sender);
        (uint256 walletATokenBalanceBefore,,,,,,,,) = dataProvider.getUserReserveData(_token, walletAddr);

        if (_isL2Direct) {
            AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
                assetId: tokenData.id,
                useDefaultMarket: true,
                amount: _amount,
                to: sender,
                market: address(0)
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3WithdrawEncode(
                tokenData.id,
                true,
                _amount,
                sender,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Withdraw.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 senderBalanceAfter = balanceOf(_token, sender);
        (uint256 walletATokenBalanceAfter,,,,,,,,) = dataProvider.getUserReserveData(_token, walletAddr);

        uint256 maxATokenIncreaseTolerance = 10 wei;

        if (_amount == type(uint256).max) {
            assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + walletATokenBalanceBefore, maxATokenIncreaseTolerance);
            assertEq(walletATokenBalanceAfter, 0);
        } else {
            assertEq(senderBalanceAfter, senderBalanceBefore + _amount);
            assertLt(walletATokenBalanceAfter, walletATokenBalanceBefore);
            assertApproxEqAbs(walletATokenBalanceAfter, walletATokenBalanceBefore - _amount, maxATokenIncreaseTolerance);    
        }
    }

    function _supply(address _token, uint256 _amount) internal {
        DataTypes.ReserveData memory tokenData = pool.getReserveData(_token);
        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _amount,
            from: sender,
            assetId: tokenData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });

        executeAaveV3Supply(supplyParams, _token, wallet, false, aaveV3SupplyContractAddr);
    }
}
