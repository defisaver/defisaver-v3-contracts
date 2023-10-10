// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./LSVUtilMainnetAddresses.sol";
import "../../../interfaces/LSTs/ICBETH.sol";
import "../../../interfaces/LSTs/IRETH.sol";
import "../../../interfaces/LSTs/IWstETH.sol";
import "../../../DS/DSMath.sol";
import "../../../utils/LSVProfitTracker.sol";

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