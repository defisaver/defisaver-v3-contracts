// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IInstaList {
    struct AccountLink {
        address first;
        address last;
        uint64 count;
    }

    function accountAddr(uint64 _id) external view returns (address);
    function accountID(address _addr) external view returns (uint64);
    function accountLink(uint64 _id) external view returns (AccountLink memory);
}