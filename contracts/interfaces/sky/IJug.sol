// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IJug {
    struct Ilks {
        uint256 duty; // borrow rate per second in 1e27
        uint256 rho;
    }

    function ilks(bytes32) external view returns (Ilks memory);
}
