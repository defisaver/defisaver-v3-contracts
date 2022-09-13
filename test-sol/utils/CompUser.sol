
// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/DS/DSProxyFactoryInterface.sol";
import "../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";

contract CompUser {

    DSProxy public proxy;
    address public proxyAddr;

    address constant FACTORY_ADDR = 0xA26e15C895EFc0616177B7c1e7270A4C7D51C997;

    constructor() {
        proxy = DSProxyFactoryInterface(FACTORY_ADDR).build();
        proxyAddr = address(proxy);
    }

    function supply(address _market, address _tokenAddr, uint _amount) public {
        CompV3Supply compV3Supply = new CompV3Supply();

        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: proxyAddr
        });

        proxy.execute(address(compV3Supply), abi.encodeWithSignature(
                "executeActionDirect(bytes)",
                abi.encode(params)
            ));
    }

    function borrow(address _market, uint _amount) public {
        CompV3Borrow compV3Borrow = new CompV3Borrow();

        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market,
            amount: _amount,
            to: msg.sender
        });

        proxy.execute(address(compV3Borrow), abi.encodeWithSignature(
                "executeActionDirect(bytes)",
                abi.encode(params)
            ));
    }

    function executeWithProxy(address _target, bytes memory _funcCalldata) public {
        proxy.execute(_target, _funcCalldata);
    }
}