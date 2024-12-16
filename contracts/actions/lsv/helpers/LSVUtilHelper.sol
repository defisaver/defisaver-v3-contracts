// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LSVUtilMainnetAddresses } from "./LSVUtilMainnetAddresses.sol";
import { ICBETH } from "../../../interfaces/LSTs/ICBETH.sol";
import { IRETH } from "../../../interfaces/LSTs/IRETH.sol";
import { IERC20 } from "../../../interfaces/IERC20.sol"; 
import { IWstETH } from "../../../interfaces/LSTs/IWstETH.sol";
import { IWeEth } from "../../../interfaces/etherFi/IWeEth.sol";
import { IRestakeManager } from "../../../interfaces/renzo/IRestakeManager.sol";
import { IRenzoOracle } from "../../../interfaces/renzo/IRenzoOracle.sol";
import { DSMath } from "../../../DS/DSMath.sol";
import { LSVProfitTracker } from "../../../utils/LSVProfitTracker.sol";

contract LSVUtilHelper is DSMath, LSVUtilMainnetAddresses{
    
    function getAmountInETHFromLST(address lstAddress, uint256 lstAmount) public view returns (uint256 ethAmount){
        if (lstAmount == 0) return 0;

        if (lstAddress == RETH_ADDRESS){
            return IRETH(RETH_ADDRESS).getEthValue(lstAmount);
        }
        if (lstAddress == CBETH_ADDRESS){
            uint256 rate = ICBETH(CBETH_ADDRESS).exchangeRate();
            return wmul(lstAmount, rate);
        }
        if (lstAddress == WSTETH_ADDRESS){
            return IWstETH(WSTETH_ADDRESS).getStETHByWstETH(lstAmount);
        }
        if (lstAddress == WEETH_ADDRESS) {
            return IWeEth(WEETH_ADDRESS).getEETHByWeETH(lstAmount);
        }
        if (lstAddress == EZETH_ADDRESS) {
            return getRenzoRate(lstAmount, false);
        }

        return lstAmount;
    }

    function getAmountInLSTFromETH(address lstAddress, uint256 ethAmount) public view returns (uint256 lstAmount) {
        if (ethAmount == 0) return 0;

        if (lstAddress == RETH_ADDRESS){
            return IRETH(RETH_ADDRESS).getRethValue(ethAmount);
        }
        if (lstAddress == CBETH_ADDRESS){
            uint256 rate = ICBETH(CBETH_ADDRESS).exchangeRate();
            return wdiv(ethAmount, rate);
        }
        if (lstAddress == WSTETH_ADDRESS){
            return IWstETH(WSTETH_ADDRESS).getWstETHByStETH(ethAmount);
        }
        if (lstAddress == WEETH_ADDRESS) {
            return IWeEth(WEETH_ADDRESS).getWeETHByeETH(ethAmount);
        }
        if (lstAddress == EZETH_ADDRESS) {
            return getRenzoRate(ethAmount, true);
        }
        
        return ethAmount;
    }

    function getRenzoRate(uint256 _amount, bool _convertFromEthToLst) public view returns (uint256 rate) {
        IRestakeManager manager = IRestakeManager(RENZO_MANAGER);
        IRenzoOracle oracle = IRenzoOracle(manager.renzoOracle());
        (, , uint256 totalTVL) = manager.calculateTVLs();
        uint256 ezEthTotalSupply = IERC20(EZETH_ADDRESS).totalSupply();

        rate = _convertFromEthToLst ?
            oracle.calculateMintAmount(totalTVL, _amount, ezEthTotalSupply) :
            oracle.calculateRedeemAmount(_amount, ezEthTotalSupply, totalTVL);
    }
}