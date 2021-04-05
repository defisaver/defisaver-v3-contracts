// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./DFSExchangeCore.sol";
import "../utils/DefisaverLogger.sol";
import "../auth/AdminAuth.sol";
import "../utils/SafeERC20.sol";

contract DFSExchange is DFSExchangeCore, AdminAuth {

    using SafeERC20 for IERC20;

    uint256 public constant SERVICE_FEE = 800; // 0.125% Fee

    // solhint-disable-next-line const-name-snakecase
    DefisaverLogger public constant logger = DefisaverLogger(0x5c55B921f590a89C1Ebe84dF170E655a82b62126);

    /// @notice Takes a src amount of tokens and converts it into the dest token
    /// @param exData Exchange data struct
    /// @param _user User address who called the exchange
    // solhint-disable-next-line visibility-modifier-order
    function sell(ExchangeData memory exData, address payable _user) public payable   {

        exData.dfsFeeDivider = SERVICE_FEE;
        exData.user = _user;

        // Perform the exchange
        (address wrapper, uint destAmount) = _sell(exData);

        // send back any leftover ether or tokens
        sendLeftover(exData.srcAddr, exData.destAddr, _user);

        // log the event
        logger.Log(address(this), msg.sender, "ExchangeSell", abi.encode(wrapper, exData.srcAddr, exData.destAddr, exData.srcAmount, destAmount));
    }

    /// @notice Takes a dest amount of tokens and converts it from the src token
    /// @param exData Exchange data struct
    /// @param _user User address who called the exchange
    // solhint-disable-next-line visibility-modifier-order
    function buy(ExchangeData memory exData, address payable _user) public payable   {

        exData.dfsFeeDivider = SERVICE_FEE;
        exData.user = _user;

        // Perform the exchange
        (address wrapper, uint srcAmount) = _buy(exData);

        // send back any leftover ether or tokens
        sendLeftover(exData.srcAddr, exData.destAddr, _user);

        // log the event
        logger.Log(address(this), msg.sender, "ExchangeBuy", abi.encode(wrapper, exData.srcAddr, exData.destAddr, srcAmount, exData.destAmount));

    }

}
