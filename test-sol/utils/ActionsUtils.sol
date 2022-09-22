// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../contracts/actions/compoundV3/CompV3Supply.sol";
import "../../contracts/actions/compoundV3/CompV3Withdraw.sol";
import "../../contracts/actions/compoundV3/CompV3Payback.sol";
import "../../contracts/actions/compoundV3/CompV3Borrow.sol";
import "../../contracts/actions/exchange/DFSSell.sol";
import "../../contracts/actions/fee/GasFeeTaker.sol";
import "../../contracts/actions/flashloan/FLBalancer.sol";
import "../../contracts/actions/checkers/CompV3RatioCheck.sol";


contract ActionsUtils {

    function compV3SupplyEncode(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) public pure returns (bytes memory) {
        CompV3Supply.Params memory params = CompV3Supply.Params({
            market: _market,
            tokenAddr: _tokenAddr,
            amount: _amount,
            from: _from
        });

        return abi.encode(params);
    }

    function compV3WithdrawEncode(
        address _market,
        address _to,
        address _tokenAddr,
        uint256 _amount
    ) public pure returns (bytes memory) {
        CompV3Withdraw.Params memory params = CompV3Withdraw.Params({
            market: _market,
            to: _to,
            asset: _tokenAddr,
            amount: _amount
        });

        return abi.encode(params);
    }

    function compV3BorrowEncode(
        address _market,
        uint _amount,
        address _to
    ) public pure returns (bytes memory) {
        CompV3Borrow.Params memory params = CompV3Borrow.Params({
            market: _market,
            amount: _amount,
            to: _to
        });

        return abi.encode(params);
    }

    function compV3PaybackEncode(
        address _market,
        address _from,
        uint256 _amount
    ) public pure returns (bytes memory) {
        CompV3Payback.Params memory params = CompV3Payback.Params({
            market: _market,
            amount: _amount,
            from: _from,
            onBehalf: address(0)
        });

        return abi.encode(params);
    }

    function sellEncode(
        address _srcAddr,
        address _destAddr,
        uint256 _srcAmount,
        address _from,
        address _to,
        address _wrapper
    ) public view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        address[] memory path = new address[](2);
        path[0] = _srcAddr;
        path[1] = _destAddr;
        bytes memory wrapperData = abi.encode(path);

        DFSExchangeData.ExchangeData memory sellParams = DFSExchangeData.ExchangeData({
            srcAddr: _srcAddr,
            destAddr: _destAddr,
            srcAmount: _srcAmount,
            destAmount: 0,
            minPrice: 0,
            dfsFeeDivider: 0,
            user: msg.sender,
            wrapper: _wrapper,
            wrapperData: wrapperData,
            offchainData: offchain
        });

        DFSSell.Params memory params = DFSSell.Params({
            exchangeData: sellParams,
            from: _from,
            to: _to
        });

        return abi.encode(params);
    }

    function gasFeeEncode(uint256 _gasUsed, address _feeToken) public pure returns (bytes memory) {
        GasFeeTaker.Params memory params = GasFeeTaker.Params({
            gasUsed: _gasUsed,
            feeToken: _feeToken,
            availableAmount: 0,
            dfsFeeDivider: 0
        });

        return abi.encode(params);
    }

    function flBalancerEncode(
        address _tokenAddr,
        uint256 _amount
    ) public pure returns (bytes memory) {
        address[] memory tokens = new address[](1);
        tokens[0] = _tokenAddr;

        uint[] memory amounts = new uint[](1);
        amounts[0] = _amount;

        uint[] memory modes = new uint[](1);
        modes[0] = 0;

        IFlashLoanBase.FlashLoanParams memory params = IFlashLoanBase.FlashLoanParams({
            tokens: tokens,
            amounts: amounts,
            modes: modes,
            onBehalfOf: address(0),
            flParamGetterAddr: address(0),
            flParamGetterData: "",
            recipeData: ""
        });

        return abi.encode(params);
    }

    function compV3RatioCheckEncode(uint8 _state, uint _targetRatio, address _market) public pure returns (bytes memory) {
        CompV3RatioCheck.Params memory params = CompV3RatioCheck.Params({
            ratioState: CompV3RatioCheck.RatioState(_state),
            targetRatio: _targetRatio,
            market: _market
        });

        return abi.encode(params);
    }
}
