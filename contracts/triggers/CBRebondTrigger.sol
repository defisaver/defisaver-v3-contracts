// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/liquity/IBondNFT.sol";
import "../views/ChickenBondsView.sol";
import "../interfaces/curve/ISwaps.sol";
import "../utils/Sqrt.sol";
import "../DS/DSMath.sol";

contract CBRebondTrigger is ITrigger, AdminAuth, DSMath, ChickenBondsView {

    using Sqrt for uint256;

    address internal constant CURVE_REGISTRY_SWAP_ADDRESS = 0x81C46fECa27B31F3ADC2b91eE4be9717d1cd3DD7;

    struct SubParams {
        uint256 bondID;
    }
    
    function isTriggered(bytes memory, bytes memory _subData)
        public
        override
        returns (bool)
    {   
        SubParams memory triggerSubData = parseInputs(_subData);

        // TODO: check state of the bond

        uint256 currentBLusdAmount = CBManager.calcAccruedBLUSD(triggerSubData.bondID);
        IChickenBondManager.BondData memory bondData = CBManager.getBondData(triggerSubData.bondID);

        uint256 optimalRebondAmount = getOptimalBLusdAmount(bondData.lusdAmount, getOptimalRebondTime());

        if (currentBLusdAmount >= optimalRebondAmount) {
            return true;
        }

        return false;
    }

    function parseInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public view override  returns (bytes memory) {
        SubParams memory triggerSubData = parseInputs(_subData);

        // update bondId to the next one which will be created once the trigger is activated
        triggerSubData.bondID = IBondNFT(BOND_NFT_ADDRESS).totalSupply() + 1;
        return abi.encode(triggerSubData);
    }
    
    function isChangeable() public pure override returns (bool){
        return true;
    }

    function getBLusdPriceFromCurve() public view returns (uint256) {
        address[9] memory routes;
        routes[0] = BLUSD_ADDRESS;
        routes[1] = BLUSD_AMM_ADDRESS;
        routes[2] = LUSD_3CRV_POOL_ADDRESS;
        routes[3] = LUSD_3CRV_POOL_ADDRESS;
        routes[4] = LUSD_TOKEN_ADDRESS;
        // rest is 0x0

        uint256[3][4] memory swapParams;
        swapParams[0] = [uint256(0), uint256(1), uint256(3)];
        swapParams[1] = [uint256(0), uint256(0), uint256(9)];
        swapParams[2] = [uint256(0), uint256(0), uint256(0)];
        swapParams[3] = [uint256(0), uint256(0), uint256(0)];

        uint256 amount = 1e18; // TODO: should this be bound amount ?

        uint256 outputAmount = ISwaps(CURVE_REGISTRY_SWAP_ADDRESS).get_exchange_multiple_amount(routes, swapParams, amount);

        return wdiv(outputAmount, amount);
    }

    function getOptimalBLusdAmount(uint256 _lusdAmount, uint256 _optimalRebondTime) public view returns (uint256) {
        return 0; // TODO: write calc
    }

    // WIP
    function getOptimalRebondTime() public view returns (uint256) {
        ChickenBondsSystemInfo memory systemInfo = getSystemInfo();

        uint256 marketPrice = getBLusdPriceFromCurve();
        uint256 floorPrice = wdiv(systemInfo.totalReserveLUSD, systemInfo.bLUSDSupply);
        uint256 marketPricePremium = wdiv(marketPrice, floorPrice);

        uint256 effectivePremium = systemInfo.chickenInAMMFee * marketPricePremium / 1e18;
        effectivePremium = marketPricePremium - effectivePremium;

        uint256 dividend = effectivePremium.sqrt() + 1;
        uint256 divisor = effectivePremium - 1;

        uint256 res = systemInfo.accrualParameter * (dividend / divisor);

        return 0;
    }

}
