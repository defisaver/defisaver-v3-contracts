// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

contract DefisaverLogger {
    event RecipeEvent(address indexed caller, string indexed logName);

    event ActionDirectEvent(address indexed caller, string indexed logName, bytes data);

    function logRecipeEvent(string memory _logName) public {
        emit RecipeEvent(msg.sender, _logName);
    }

    function logActionDirectEvent(string memory _logName, bytes memory _data) public {
        emit ActionDirectEvent(msg.sender, _logName, _data);
    }
}
