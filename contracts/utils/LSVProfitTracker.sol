// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

/// @dev We are aware that anyone can change their unrealisedProfit, the worst thing someone can do is remove LSV fee
/// @dev It's tradeoff for much higher gas usage that would happen if we'd have much more strict requirements and checks
contract LSVProfitTracker{

    mapping(uint256 => mapping(address => int256)) public unrealisedProfit;

    function supply(uint256 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] -= downCastUintToInt(_amount); 
    }

    function borrow(uint256 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] += downCastUintToInt(_amount); 
    }
    
    function payback(uint256 _protocol, uint256 _amount) public {
        unrealisedProfit[_protocol][msg.sender] -= downCastUintToInt(_amount); 
    }

    function withdraw(uint256 _protocol, uint256 _amount,  bool _isClosingVault) public returns (uint256 realisedProfit){
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