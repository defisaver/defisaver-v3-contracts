// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousTracker is CoreHelper {
    error NotSubOwner(uint256, address);

    mapping(uint256 => address) private subToWallet;

    // ! Maybe check if already set?
    function setSubToWallet(uint256 _subId) external {
        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        subToWallet[_subId] = msg.sender;
    }

    // ! Maybe check if it exist?
    function removeWalletForSub(uint256 _subId) external {
        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        delete subToWallet[_subId];
    }

    function getWalletForSub(uint256 _subId) external view returns (address) {
        return subToWallet[_subId];
    }
}

