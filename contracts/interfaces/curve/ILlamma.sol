// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface ILlamma {
    function p_oracle_up(int256) external view returns (uint256);
    function p_oracle_down(int256) external view returns (uint256);
    function p_current_up(int256) external view returns (uint256);
    function p_current_down(int256) external view returns (uint256);
    function bands_x(int256) external view returns (uint256);
    function bands_y(int256) external view returns (uint256);
}

