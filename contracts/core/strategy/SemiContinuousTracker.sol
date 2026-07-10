// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISubStorage } from "../../interfaces/core/ISubStorage.sol";
import { StrategyModel } from "../../core/strategy/StrategyModel.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";

contract SemiContinuousTracker is CoreHelper {
    error NotSubOwner(uint256, address);

    event SetInStorage(uint256 indexed subId, address indexed wallet);
    event RemovedFromStorage(uint256 indexed subId, address indexed wallet);

    mapping(uint256 => address) private subToWallet;

    function setSubToWallet(uint256 _subId) external {
        if (isSet(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        subToWallet[_subId] = msg.sender;
        emit SetInStorage(_subId, msg.sender);
    }

    function removeWalletForSub(uint256 _subId) external {
        if (!isSet(_subId)) return;

        StrategyModel.StoredSubData memory subData = ISubStorage(SUB_STORAGE_ADDR).getSub(_subId);

        if (subData.walletAddr != bytes20(msg.sender)) {
            revert NotSubOwner(_subId, msg.sender);
        }

        delete subToWallet[_subId];
        emit RemovedFromStorage(_subId, msg.sender);
    }

    function getWalletForSub(uint256 _subId) external view returns (address) {
        return subToWallet[_subId];
    }

    function isSet(uint256 _subId) public view returns (bool) {
        return subToWallet[_subId] != address(0);
    }
}

