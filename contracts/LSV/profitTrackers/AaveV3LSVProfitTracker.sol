// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../actions/aaveV3/helpers/AaveV3Helper.sol";
import "../helpers/LSVUtilHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/LSTs/ICBETH.sol";
import "../../interfaces/LSTs/IRETH.sol";
import "../../interfaces/LSTs/IWstETH.sol";
import "../../DS/DSMath.sol";

contract AaveV3LSVProfitTracker is AaveV3Helper, LSVUtilHelper, DSMath{
    using TokenUtils for address;

    mapping(address => int256) public unrealisedProfit;

    function supply(address _token, uint256 _amount) public {
        uint256 amountInETH = getAmountInETHFromLST(_token, _amount);
        unrealisedProfit[msg.sender] -= downCastUintToInt(amountInETH); 

    }

    function borrow(uint256 _amount) public {
        unrealisedProfit[msg.sender] += downCastUintToInt(_amount); 
    }
    
    function payback(uint256 _amount) public {
        unrealisedProfit[msg.sender] -= downCastUintToInt(_amount); 
    }

    function withdraw(address _token, uint256 _amount, address _market) public returns (uint256 feeAmountInLST){
        uint256 amountInETH = getAmountInETHFromLST(_token, _amount);
        unrealisedProfit[msg.sender] += downCastUintToInt(amountInETH);
        
        if (unrealisedProfit[msg.sender] > 0){
            uint256 feeAmountInETH = uint256(unrealisedProfit[msg.sender]) / 10;
            feeAmountInLST = getAmountInLSTFromETH(_token, feeAmountInETH);
            unrealisedProfit[msg.sender] = 0;
        } else if (isPositionClosed(msg.sender, _token, _market)) {
            unrealisedProfit[msg.sender] = 0;
        }

        return feeAmountInLST;
    }

    function getAmountInETHFromLST(address lstAddress, uint256 lstAmount) public view returns (uint256 ethAmount){
        
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

    function downCastUintToInt(uint256 uintAmount) internal pure returns(int256 amount){
        require(uintAmount <= uint256(type(int256).max));
        return int256(uintAmount);
    }

}