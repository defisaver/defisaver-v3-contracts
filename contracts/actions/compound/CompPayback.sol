// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Payback a token a user borrowed from Compound
contract CompPayback is ActionBase, TokenUtils, GasBurner {

    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, uint256 amount) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);

        uint256 withdrawAmount = _payback(tokenAddr, amount);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount) = parseInputs(_callData);

        _payback(tokenAddr, amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    // TODO: should allow uint(-1) ?
    function _payback(address _tokenAddr, uint _amount) internal returns (uint) {
        address cTokenAddr = ICToken(_tokenAddr).underlying();

        approveToken(_tokenAddr, cTokenAddr, _amount);

        if (_amount == uint(-1)) {
            _amount = ICToken(cTokenAddr).borrowBalanceCurrent(address(this));
        }

        if (_tokenAddr != ETH_ADDR) {
            pullTokens(_tokenAddr, address(this), _amount);

            require(ICToken(cTokenAddr).repayBorrow(_amount) == 0);
        } else {
            ICToken(cTokenAddr).repayBorrow{value: _amount}();
            msg.sender.transfer(address(this).balance); // send back the extra eth
        }

        return _amount;
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
            uint256 amount
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
    }
}