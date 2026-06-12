// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleManager
/// @notice Centralized roles + simple group assignment for academic workflows.
contract RoleManager is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROFESSOR_ROLE = keccak256("PROFESSOR_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");

    mapping(address => string) private _groups;

    event GroupAssigned(address indexed account, string group);
    event GroupRevoked(address indexed account, string previousGroup);

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "RoleManager: admin is zero");

        // DEFAULT_ADMIN_ROLE is the root authority in OZ AccessControl.
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);

        // ADMIN_ROLE is the operational admin role for the system.
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _grantRole(ADMIN_ROLE, initialAdmin);

        // Professors/students are managed by admins (not by default admin directly).
        _setRoleAdmin(PROFESSOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(STUDENT_ROLE, ADMIN_ROLE);
    }

    /// @notice Assign an academic group to an account (e.g., cohort or class section).
    function assignGroup(address account, string calldata group) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "RoleManager: account is zero");
        require(bytes(group).length != 0, "RoleManager: empty group");

        _groups[account] = group;
        emit GroupAssigned(account, group);
    }

    /// @notice Get the group string assigned to an account (empty if none).
    function getGroup(address account) external view returns (string memory) {
        return _groups[account];
    }

    /// @notice Revoke the group assignment for an account.
    function revokeGroup(address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "RoleManager: account is zero");

        string memory prev = _groups[account];
        require(bytes(prev).length != 0, "RoleManager: no group");

        delete _groups[account];
        emit GroupRevoked(account, prev);
    }
}

