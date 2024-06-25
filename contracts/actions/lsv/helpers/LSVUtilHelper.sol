// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LSVUtilMainnetAddresses } from "./LSVUtilMainnetAddresses.sol";
import { ICBETH } from "../../../interfaces/LSTs/ICBETH.sol";
import { IRETH } from "../../../interfaces/LSTs/IRETH.sol";
import { IWstETH } from "../../../interfaces/LSTs/IWstETH.sol";
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
        
        return ethAmount;
    }
}