// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract LSVProfitTracker{

    mapping(uint8 => mapping(address => int256)) public unrealisedProfit;

    function supply(uint8 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] -= downCastUintToInt(_amount); 
    }

    function borrow(uint8 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] += downCastUintToInt(_amount); 
    }
    
    function payback(uint8 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] -= downCastUintToInt(_amount); 
    }

    function withdraw(uint8 _protocol, uint256 _amount,  bool _isClosingVault) public returns (uint256 realisedProfit){
        unrealisedProfit[_protocol][msg.sender] += downCastUintToInt(_amount);
        
        if (unrealisedProfit[_protocol][msg.sender] > 0){
            realisedProfit = uint256(unrealisedProfit[_protocol][msg.sender]);
            unrealisedProfit[_protocol][msg.sender] = 0;
        } else if (_isClosingVault) {
            unrealisedProfit[_protocol][msg.sender] = 0;
        }

        return realisedProfit;
    }

    function downCastUintToInt(uint256 uintAmount) internal pure returns(int256 amount){
        require(uintAmount <= uint256(type(int256).max));
        return int256(uintAmount);
    }
}