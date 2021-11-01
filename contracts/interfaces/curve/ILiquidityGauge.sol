// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

interface ILiquidityGauge {
    function lp_token() external view returns (address);
    function balanceOf(address) external view returns (uint256);
    
    function deposit(uint256 _amount, address _receiver) external;
    function approved_to_deposit(address _depositor, address _recipient) external view returns (bool);
    function set_approve_deposit(address _depositor, bool _canDeposit) external;

    function withdraw(uint256 _amount) external;
}