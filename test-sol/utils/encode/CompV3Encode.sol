// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompV3Supply } from "../../../contracts/actions/compoundV3/CompV3Supply.sol";
import { CompV3Withdraw } from "../../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import { CompV3Payback } from "../../../contracts/actions/compoundV3/CompV3Payback.sol";
import { CompV3Borrow } from "../../../contracts/actions/compoundV3/CompV3Borrow.sol";
import { CompV3RatioCheck } from "../../../contracts/actions/checkers/CompV3RatioCheck.sol";

library CompV3Encode {
    function supply(address _market, address _tokenAddr, uint256 _amount, address _from)
        public
        pure
        returns (bytes memory)
    {
        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: _from,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function withdraw(address _market, address _to, address _tokenAddr, uint256 _amount)
        public
        pure
        returns (bytes memory)
    {
        CompV3Withdraw.Params memory params = CompV3Withdraw.Params({
            market: _market, to: _to, asset: _tokenAddr, amount: _amount, onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function borrow(address _market, uint256 _amount, address _to)
        public
        pure
        returns (bytes memory)
    {
        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market, amount: _amount, to: _to, onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function payback(address _market, address _from, uint256 _amount)
        public
        pure
        returns (bytes memory)
    {
        CompV3Payback.Params memory params = CompV3Payback.Params({
            market: _market, amount: _amount, from: _from, onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function ratioCheck(uint8 _state, uint256 _targetRatio, address _market)
        public
        pure
        returns (bytes memory)
    {
        CompV3RatioCheck.Params memory params = CompV3RatioCheck.Params({
            ratioState: CompV3RatioCheck.RatioState(_state),
            targetRatio: _targetRatio,
            market: _market,
            user: address(0)
        });

        return abi.encode(params);
    }
}
