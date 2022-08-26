// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

abstract contract ICometExt {
    
    function allow(address manager, bool isAllowed) virtual external;
    
}