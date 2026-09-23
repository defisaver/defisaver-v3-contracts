// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Interface for the Discount contract
interface IDiscount {
    function serviceFeesDisabled(address _wallet) external view returns (bool);
    function reenableServiceFee(address _wallet) external;
    function disableServiceFee(address _wallet) external;
}
