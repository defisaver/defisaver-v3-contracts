// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {ILockstakeEngine} from "../../contracts/interfaces/sky/ILockstakeEngine.sol";
import {IStakingRewards} from "../../contracts/interfaces/sky/IStakingRewards.sol";
import {IVat} from "../../contracts/interfaces/sky/IVat.sol";
import {IJug} from "../../contracts/interfaces/sky/IJug.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {SkyHelper} from "../../contracts/actions/sky/helpers/SkyHelper.sol";

contract SkyView is SkyHelper {
    struct UrnInfo {
        address urnAddr;
        address selectedFarm;
        address farmRewardToken;
        uint256 amountStaked;
        uint256 amountBorrowed;
        uint256 amountEarned;
    }

    struct GeneralInfo {
        uint256 totalSkyStaked; // in 1e18
        uint256 debtCeiling; // in 1e45
        uint256 borrowRatePerSecond; // in 1e27
        uint256 totalSkyLockedInUSDSFarm;
        uint256 totalSkyLockedInSparkFarm;
    }

    function getUserInfo(address _user) public view returns (UrnInfo[] memory) {
        uint256 numOfUrns = ILockstakeEngine(STAKING_ENGINE).ownerUrnsCount(_user);
        UrnInfo[] memory urns = new UrnInfo[](numOfUrns);

        for (uint256 i = 0; i < numOfUrns; ++i) {
            urns[i] = getUrnInfo(_user, i);
        }

        return urns;
    }

    function getUrnInfo(address _user, uint256 _index) public view returns (UrnInfo memory) {
        ILockstakeEngine engine = ILockstakeEngine(STAKING_ENGINE);
        address urnAddr = engine.ownerUrns(_user, _index);
        address selectedFarm = engine.urnFarms(urnAddr);
        address farmRewardToken = IStakingRewards(selectedFarm).rewardsToken();

        IVat.Urn memory urn = IVat(engine.vat()).urns(engine.ilk(), urnAddr);
        uint256 amountStaked = urn.ink;
        uint256 amountBorrowed = urn.art;
        uint256 amountEarned = IStakingRewards(selectedFarm).earned(urnAddr);

        return UrnInfo({
            urnAddr: urnAddr,
            selectedFarm: selectedFarm,
            farmRewardToken: farmRewardToken,
            amountStaked: amountStaked,
            amountBorrowed: amountBorrowed,
            amountEarned: amountEarned
        });
    }

    function getGeneralInfo() public view returns (GeneralInfo memory) {
        uint256 totalSkyStaked = IERC20(LOCK_STAKE_SKY).totalSupply();

        ILockstakeEngine engine = ILockstakeEngine(STAKING_ENGINE);
        (,,, uint256 debtCeiling,) = IVat(engine.vat()).ilks(engine.ilk());

        uint256 borrowRatePerSecond = IJug(engine.jug()).ilks(engine.ilk()).duty;

        uint256 totalSkyLockedInUSDSFarm = IERC20(LOCK_STAKE_SKY).balanceOf(USDS_FARM);
        uint256 totalSkyLockedInSparkFarm = IERC20(LOCK_STAKE_SKY).balanceOf(SPARK_FARM);
        return GeneralInfo({
            totalSkyStaked: totalSkyStaked,
            debtCeiling: debtCeiling,
            borrowRatePerSecond: borrowRatePerSecond,
            totalSkyLockedInUSDSFarm: totalSkyLockedInUSDSFarm,
            totalSkyLockedInSparkFarm: totalSkyLockedInSparkFarm
        });
    }
}
