// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmWithdraw } from "../../../contracts/actions/ftdnmm/FtDnmmWithdraw.sol";
import { FtDnmmBorrow } from "../../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmPayback } from "../../../contracts/actions/ftdnmm/FtDnmmPayback.sol";

library FtDnmmEncode {
    function supply(address _asset, uint256 _amount, address _from)
        internal
        pure
        returns (bytes memory params)
    {
        params = abi.encode(FtDnmmSupply.Params({ asset: _asset, amount: _amount, from: _from }));
    }

    function withdraw(address _asset, uint256 _amount, address _to)
        internal
        pure
        returns (bytes memory params)
    {
        params = abi.encode(FtDnmmWithdraw.Params({ asset: _asset, amount: _amount, to: _to }));
    }

    function borrow(address _asset, uint256 _amount, address _to)
        internal
        pure
        returns (bytes memory params)
    {
        params = abi.encode(FtDnmmBorrow.Params({ asset: _asset, amount: _amount, to: _to }));
    }

    function payback(address _asset, uint256 _amount, address _from)
        internal
        pure
        returns (bytes memory params)
    {
        params = abi.encode(FtDnmmPayback.Params({ asset: _asset, amount: _amount, from: _from }));
    }
}
