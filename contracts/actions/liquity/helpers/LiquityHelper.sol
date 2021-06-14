// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../utils/TokenUtils.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IBorrowerOperations.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";
import "../../../interfaces/liquity/IHintHelpers.sol";
import "../../../interfaces/liquity/ISortedTroves.sol";
import "../../../interfaces/liquity/ICollSurplusPool.sol";
import "../../../interfaces/liquity/IStabilityPool.sol";
import "../../../interfaces/liquity/ILQTYStaking.sol";

contract LiquityHelper {
    using TokenUtils for address;

    uint constant public LUSD_GAS_COMPENSATION = 200e18;
    address constant public LUSDTokenAddr = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
    address constant public LQTYTokenAddr = 0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D;
    address constant public PriceFeedAddr = 0x4c517D4e2C851CA76d7eC94B805269Df0f2201De;
    address constant public BorrowerOperationsAddr = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;
    address constant public TroveManagerAddr = 0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2;
    address constant public SortedTrovesAddr = 0x8FdD3fbFEb32b28fb73555518f8b361bCeA741A6;
    address constant public HintHelpersAddr = 0xE84251b93D9524E0d2e621Ba7dc7cb3579F997C0;
    address constant public CollSurplusPoolAddr = 0x3D32e8b97Ed5881324241Cf03b2DA5E2EBcE5521;
    address constant public StabilityPoolAddr = 0x66017D22b0f8556afDd19FC67041899Eb65a21bb;
    address constant public LQTYStakingAddr = 0x4f9Fbb3f1E99B56e0Fe2892e623Ed36A76Fc605d;

    IPriceFeed constant public PriceFeed = IPriceFeed(PriceFeedAddr);
    IBorrowerOperations constant public BorrowerOperations = IBorrowerOperations(BorrowerOperationsAddr);
    ITroveManager constant public TroveManager = ITroveManager(TroveManagerAddr);
    ISortedTroves constant public SortedTroves = ISortedTroves(SortedTrovesAddr);
    IHintHelpers constant public HintHelpers = IHintHelpers(HintHelpersAddr);
    ICollSurplusPool constant public CollSurplusPool = ICollSurplusPool(CollSurplusPoolAddr);
    IStabilityPool constant public StabilityPool = IStabilityPool(StabilityPoolAddr);
    ILQTYStaking constant public LQTYStaking = ILQTYStaking(LQTYStakingAddr);
    
    function withdrawStabilityGains(uint256 _ethGain, uint256 _lqtyGain, address _wethTo, address _lqtyTo) internal {
        if (_ethGain > 0) {
            TokenUtils.depositWeth(_ethGain);
            TokenUtils.WETH_ADDR.withdrawTokens(_wethTo, _ethGain);
        }
        if (_lqtyGain > 0) {
            LQTYTokenAddr.withdrawTokens(_lqtyTo, _lqtyGain);
        }
    }
}