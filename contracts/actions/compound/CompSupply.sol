// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Supply a token to Compound
contract CompSupply is ActionBase, TokenUtils, GasBurner {

    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);

        uint256 withdrawAmount = _supply(tokenAddr, amount, from);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _supply(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    function _supply(address _tokenAddr, uint _amount, address _from) internal returns (uint) {
        address cTokenAddr = ICToken(_tokenAddr).underlying();

        // if amount -1, pull current proxy balance
        if (_amount == uint(-1)) {
            _amount = getBalance(_tokenAddr, address(this));
        }

        pullTokens(_tokenAddr, _from, _amount);
        approveToken(_tokenAddr, cTokenAddr, uint(-1));

        if (isAlreadyInMarket(cTokenAddr)) {
            enterMarket(cTokenAddr);
        }

        if (_tokenAddr != ETH_ADDR) {
            require(ICToken(cTokenAddr).mint(_amount) == 0, "Comp supply failed");
        } else {
            ICToken(cTokenAddr).mint{value: msg.value}(); // reverts on fail
        }

        return _amount;
    }

    function isAlreadyInMarket(address _cToken) internal view returns (bool) {
        address[] memory addrInMarkets = 
            IComptroller(COMPTROLLER_ADDR).getAssetsIn(address(this));

        for (uint i = 0; i < addrInMarkets.length; ++i) {
            if (addrInMarkets[i] == _cToken) {
                return true;
            }
        }

        return false;
    }

    /// @notice Enters the Compound market so it can be deposited/borrowed
    /// @param _cTokenAddr CToken address of the token
    function enterMarket(address _cTokenAddr) public {
        address[] memory markets = new address[](1);
        markets[0] = _cTokenAddr;

        IComptroller(COMPTROLLER_ADDR).enterMarkets(markets);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            uint256 amount,
            address from
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
    }
}