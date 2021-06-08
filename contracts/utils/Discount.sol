// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

contract Discount {
    address public owner;
    mapping(address => CustomServiceFee) public serviceFees;

    uint256 constant MAX_SERVICE_FEE = 400;

    error OnlyOwner();
    error WrongFeeValue();

    struct CustomServiceFee {
        bool active;
        uint256 amount;
    }

    constructor() {
        owner = msg.sender;
    }

    function isCustomFeeSet(address _user) public view returns (bool) {
        return serviceFees[_user].active;
    }

    function getCustomServiceFee(address _user) public view returns (uint256) {
        return serviceFees[_user].amount;
    }

    function setServiceFee(address _user, uint256 _fee) public {
        if (msg.sender != owner){
            revert OnlyOwner();
        }

        if (!(_fee >= MAX_SERVICE_FEE || _fee == 0)){
            revert WrongFeeValue();
        }

        serviceFees[_user] = CustomServiceFee({active: true, amount: _fee});
    }

    function disableServiceFee(address _user) public {
        if (msg.sender != owner){
            revert OnlyOwner();
        }

        serviceFees[_user] = CustomServiceFee({active: false, amount: 0});
    }
}
