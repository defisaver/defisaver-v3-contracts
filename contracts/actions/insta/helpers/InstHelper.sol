// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
import "./MainnetInstHelper.sol";

import "../../../interfaces/insta/IInstaIndex.sol";
import "../../../interfaces/insta/IInstaMakerDAOMerkleDistributor.sol";
import "../../../interfaces/mcd/IManager.sol";

/// @title Utility functions and data used in AaveV2 actions
contract InstHelper is MainnetInstHelper{

    IManager public constant mcdManager =  
        IManager(MCD_MANAGER);

    IInstaIndex public constant instaAccountBuilder = 
        IInstaIndex(INST_ACCOUNT_BUILDER);

    IInstaMakerDAOMerkleDistributor public constant rewardDistributor =
        IInstaMakerDAOMerkleDistributor(INST_MAKER_MERKLE_DISTRIBUTOR);
}