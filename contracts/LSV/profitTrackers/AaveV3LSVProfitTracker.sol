// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../actions/aaveV3/helpers/AaveV3Helper.sol";
import "../actions/aaveV3/helpers/AaveV3LSVHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/LSTs/ICBETH.sol";
import "../../interfaces/LSTs/IRETH.sol";
import "../../interfaces/LSTs/IWstETH.sol";
import "../../DS/DSMath.sol";

contract AaveV3LSVProfitTracker is AaveV3Helper, AaveV3LSVHelper, DSMath{
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

    function withdraw(address _token, uint256 _amount, address _market) public returns (uint256 feeAmount){
        uint256 amountInETH = getAmountInETHFromLST(_token, _amount);
        unrealisedProfit[msg.sender] += downCastUintToInt(amountInETH);
        
        if (unrealisedProfit[msg.sender] > 0){
            feeAmount = uint256(unrealisedProfit[msg.sender]) / 10;
            unrealisedProfit[msg.sender] = 0;
        } else if (isPositionClosed(msg.sender, _token, _market)) {
            unrealisedProfit[msg.sender] = 0;
        }
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

    function downCastUintToInt(uint256 uintAmount) internal pure returns(int256 amount){
        require(uintAmount <= uint256(type(int256).max));
        return int256(uintAmount);
    }

    function isPositionClosed(address _user, address _collToken, address _market) internal view returns(bool){
        IL2PoolV3 lendingPool = getLendingPool(_market);
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_collToken);
        uint256 aTokenBalance = reserveData.aTokenAddress.getBalance(_user);
        if (aTokenBalance == 0) {
            return true;
        } else {
            return false;
        }
    }

}