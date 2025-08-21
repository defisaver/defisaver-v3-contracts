// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC4626 } from "../../../../contracts/interfaces/IERC4626.sol";
import { IAToken } from "../../../../contracts/interfaces/aave/IAToken.sol";
import { IL2PoolV3 } from "../../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { AaveV3Helper } from "../../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { Addresses } from "../../../utils/Addresses.sol";
import { ActionsUtils } from "../../../utils/ActionsUtils.sol";
import { BaseTest } from "../../../utils/BaseTest.sol";

contract TestUmbrellaCommon is AaveV3Helper, ActionsUtils, BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    address aaveV3SupplyContractAddr;
    address[] stkTokens;

    
    struct Snapshot {
        uint256 senderSupplyTokenBalance;
        uint256 senderWaTokenBalance;
        uint256 senderStkTokenBalance;
        uint256 walletSupplyTokenBalance;
        uint256 walletWaTokenBalance;
        uint256 walletStkTokenBalance;
    }

    function getStkTokens() public pure returns (address[] memory)  {
        address[] memory tokens = new address[](4);
        tokens[0] = Addresses.STK_WETH_TOKEN;
        tokens[1] = Addresses.STK_USDC_TOKEN;
        tokens[2] = Addresses.STK_USDT_TOKEN;
        tokens[3] = Addresses.STK_GHO_TOKEN;
        return tokens;
    }

    function takeSnapshot(
        address _stkToken,
        address _waTokenOrGHO,
        address _supplyToken
    ) public view returns (Snapshot memory snapshot) {
        snapshot.senderSupplyTokenBalance = balanceOf(_supplyToken, sender);
        snapshot.senderStkTokenBalance = balanceOf(_stkToken, sender);
        snapshot.senderWaTokenBalance = balanceOf(_waTokenOrGHO, sender);
        snapshot.walletSupplyTokenBalance = balanceOf(_supplyToken, walletAddr);
        snapshot.walletStkTokenBalance = balanceOf(_stkToken, walletAddr);
        snapshot.walletWaTokenBalance = balanceOf(_waTokenOrGHO, walletAddr);
    }

    function giveATokens(address _aToken, uint256 _amount) public {
        address underlying = IAToken(_aToken).UNDERLYING_ASSET_ADDRESS();
        give(underlying, sender, _amount);
        IL2PoolV3 pool = getLendingPool(DEFAULT_AAVE_MARKET);
        approveAsSender(sender, underlying, address(pool), _amount);
        vm.prank(sender);
        pool.supply(underlying, _amount, sender, AAVE_REFERRAL_CODE);
    }

    function getMinSharesOut(
        address _stkToken,
        address _waTokenOrGHO,
        uint256 _amount
    ) public view returns (uint256 minSharesOut) {
        if (_waTokenOrGHO != Addresses.GHO_TOKEN) {
            // we do aToken -> waToken -> stkToken so we need to calculate:
            // estimated waToken amount from aToken -> waToken conversion
            // estimated stkToken amount from waToken -> stkToken conversion
            minSharesOut = IERC4626(_waTokenOrGHO).previewDeposit(_amount);
            minSharesOut = IERC4626(_stkToken).previewDeposit(minSharesOut);
        } else {
            minSharesOut = IERC4626(_stkToken).previewDeposit(_amount);
        }
        minSharesOut = minSharesOut * 999 / 1000;
    }

}