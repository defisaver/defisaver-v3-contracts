// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./L2StrategyModel.sol";
import "../auth/AdminAuth.sol";

contract CookBook is L2StrategyModel, AdminAuth {
    RecipeTemplate[] public templates;
    bool public openToPublic = false;

    error NoAuthToCreateTemplate(address,bool);
    error CookBookFull();
    event TemplateCreated(uint16 indexed templateId);

    modifier onlyAuthCreators {
        if (adminVault.owner() != msg.sender && openToPublic == false) {
            revert NoAuthToCreateTemplate(msg.sender, openToPublic);
        }

        _;
    }

    /// @notice Writes template data in an array
    /// @dev Can only be called by auth addresses if it's not open to public
    /// @param _template Template data to store
    function createTemplate(RecipeTemplate memory _template) public onlyAuthCreators returns (uint16 templateId) {
        if (templates.length == type(uint16).max) revert CookBookFull();

        templateId = uint16(templates.length);
        templates.push(_template);

        emit TemplateCreated(templateId);
    }

    /// @notice Switch to determine if templates can be created by anyone
    /// @dev Callable only by the owner
    /// @param _openToPublic Flag if true anyone can create templates
    function changeEditPermission(bool _openToPublic) public onlyOwner {
        openToPublic = _openToPublic;
    }

    function getTemplate(uint16 _templateId) external view returns (RecipeTemplate memory) {
        return templates[_templateId];
    }

    function getTemplateCount() public view returns (uint16) {
        return uint16(templates.length);
    }

}