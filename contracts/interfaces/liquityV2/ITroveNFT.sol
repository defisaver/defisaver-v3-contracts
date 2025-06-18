// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface ITroveNFT {
    function mint(address _owner, uint256 _troveId) external;
    function burn(uint256 _troveId) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function ownerOf(uint256 tokenId) external view returns (address);
}
