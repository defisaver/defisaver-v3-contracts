// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract DefisaverLogger {
    event LogEvent(
        address indexed contractAddress,
        address indexed caller,
        string indexed logName,
        bytes data
    );

    // solhint-disable-next-line func-name-mixedcase
    function Log(
        address _contract,
        address _caller,
        string memory _logName,
        bytes memory _data
    ) public {
        emit LogEvent(_contract, _caller, _logName, _data);
    }

    // The code above would become unused
    event RecipeEvent(
        address indexed caller,
        string indexed logName
    );

    event ActionEvent(
        address indexed caller,
        string indexed logName,
        bytes data
    );

    function logRecipeEvent(
        address _caller,
        string memory _logName
    ) public {
        emit RecipeEvent(_caller, _logName);
    }

    function logActionEvent(
        address _caller,
        string memory _logName,
        bytes memory _data
    ) public {
        emit ActionEvent(_caller, _logName, _data);
    }
}
