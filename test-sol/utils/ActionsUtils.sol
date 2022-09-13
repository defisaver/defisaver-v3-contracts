// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";
import "../../contracts/actions/exchange/DFSSell.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";


contract ActionsUtils {
    function compV3WithdrawEncode(address _market, address _to, address _tokenAddr, uint _amount) public pure returns (bytes memory) {
        CompV3Withdraw.Params memory params = CompV3Withdraw.Params({
            market: _market,
            to: _to,
            asset: _tokenAddr,
            amount: _amount
        });

        return abi.encode(params);
    }

    function sellEncode(address _srcAddr, address _destAddr, uint _srcAmount, address _from, address _to, address _wrapper, bytes memory _wrapperData) public view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        DFSExchangeData.ExchangeData memory sellParams = DFSExchangeData.ExchangeData({
            srcAddr: _srcAddr,
            destAddr: _destAddr,
            srcAmount: _srcAmount,
            destAmount: 0,
            minPrice: 0,
            dfsFeeDivider: 0,
            user: msg.sender,
            wrapper: _wrapper,
            wrapperData: _wrapperData,
            offchainData: offchain
        });

        DFSSell.Params memory params = DFSSell.Params({
            exchangeData: sellParams,
            from: _from,
            to: _to
        });

        return abi.encode(params);
    }

    function gasFeeEncode(uint _gasUsed, address _feeToken) public pure returns (bytes memory) {
        GasFeeTaker.Params memory params = GasFeeTaker.Params({
            gasUsed: _gasUsed,
            feeToken: _feeToken,
            availableAmount: 0,
            dfsFeeDivider: 0
        });

        return abi.encode(params);
    }

    function compV3PaybackEncode(address _market, address _from, uint _amount) public pure returns (bytes memory) {
        CompV3Payback.Params memory params = CompV3Payback.Params({
            market: _market,
            amount: _amount,
            from: _from,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }
}