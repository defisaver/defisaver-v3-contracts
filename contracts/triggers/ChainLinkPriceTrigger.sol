// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/chainlink/IFeedRegistry.sol";
import "../utils/Denominations.sol";
import "../utils/TokenUtils.sol";

contract ChainLinkPriceTrigger is ITrigger, AdminAuth {
    using TokenUtils for address;

    enum PriceState {
        OVER,
        UNDER
    }

    struct SubParams {
        address tokenAddr;
        uint256 price;
        uint8 state;
    }

    IFeedRegistry public constant feedRegistry =
        IFeedRegistry(0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf);

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currPrice = getPrice(triggerSubData.tokenAddr);

        if (PriceState(triggerSubData.state) == PriceState.OVER) {
            if (currPrice > triggerSubData.price) return true;
        }

        if (PriceState(triggerSubData.state) == PriceState.UNDER) {
            if (currPrice < triggerSubData.price) return true;
        }

        return false;
    }

    function getPrice(address _tokenAddr) public view returns (uint256) {
        if (_tokenAddr == TokenUtils.WETH_ADDR) {
            _tokenAddr = TokenUtils.ETH_ADDR;
        }

        // TODO: diff. denominations?
        (, int256 price, , , ) = feedRegistry.latestRoundData(_tokenAddr, Denominations.USD);

        return uint256(price);
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _callData)
        internal
        pure
        returns (SubParams memory params)
    {
        params = abi.decode(_callData, (SubParams));
    }
}
