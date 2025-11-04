// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSAuthority } from "./IDSAuthority.sol";

interface IDSAuth {
    function authority() external view returns (IDSAuthority);
    function owner() external view returns (address);
    function setOwner(address owner_) external;
    function setAuthority(IDSAuthority authority_) external;
    function isAuthorized(address src, bytes4 sig) external view returns (bool);
}
