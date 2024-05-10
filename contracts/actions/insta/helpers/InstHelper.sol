// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;
import { MainnetInstAddresses } from "./MainnetInstAddresses.sol";

import { IInstaIndex } from "../../../interfaces/insta/IInstaIndex.sol";
import { IInstaMakerDAOMerkleDistributor } from "../../../interfaces/insta/IInstaMakerDAOMerkleDistributor.sol";
import { IManager } from "../../../interfaces/mcd/IManager.sol";

/// @title Utility functions and data used in AaveV2 actions
contract InstHelper is MainnetInstAddresses{

    IManager public constant mcdManager =  
        IManager(MCD_MANAGER);

    IInstaIndex public constant instaAccountBuilder = 
        IInstaIndex(INST_ACCOUNT_BUILDER);

    IInstaMakerDAOMerkleDistributor public constant rewardDistributor =
        IInstaMakerDAOMerkleDistributor(INST_MAKER_MERKLE_DISTRIBUTOR);
}