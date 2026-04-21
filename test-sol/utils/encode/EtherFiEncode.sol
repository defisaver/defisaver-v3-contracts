// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { EtherFiStake } from "../../../contracts/actions/etherfi/EtherFiStake.sol";
import { EtherFiWrap } from "../../../contracts/actions/etherfi/EtherFiWrap.sol";
import { EtherFiUnwrap } from "../../../contracts/actions/etherfi/EtherFiUnwrap.sol";

library EtherFiEncode {
    function stake(uint256 _amount, address _from, address _to, bool _shouldWrap)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            EtherFiStake.Params({ amount: _amount, from: _from, to: _to, shouldWrap: _shouldWrap })
        );
    }

    function wrap(uint256 _amount, address _from, address _to)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(EtherFiWrap.Params({ amount: _amount, from: _from, to: _to }));
    }

    function unwrap(uint256 _amount, address _from, address _to)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(EtherFiUnwrap.Params({ amount: _amount, from: _from, to: _to }));
    }
}
