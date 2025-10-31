// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IBondNFT } from "./IBondNFT.sol";

interface IBondNFTArtwork {
    function tokenURI(uint256 _tokenID, IBondNFT.BondExtraData calldata _bondExtraData)
        external
        view
        returns (string memory);
}
