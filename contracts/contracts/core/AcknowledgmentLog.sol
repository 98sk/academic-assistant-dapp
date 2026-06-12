// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRoleManagerForAcks {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function STUDENT_ROLE() external view returns (bytes32);
    function getGroup(address account) external view returns (string memory);
}

interface IAnnouncementLog {
    function announcementExists(uint256 id) external view returns (bool);

    function getAnnouncement(
        uint256 id
    )
        external
        view
        returns (
            bytes32 contentHash,
            string memory category,
            string memory targetGroup,
            uint256 timestamp,
            address publisher
        );
}

/// @title AcknowledgmentLog
/// @notice Students acknowledge announcements; duplicates prevented; group targeting enforced.
contract AcknowledgmentLog {
    struct Acknowledgment {
        uint64 timestamp;
        bool exists;
    }

    IRoleManagerForAcks public immutable roleManager;
    IAnnouncementLog public immutable announcementLog;

    // announcementId => student => acknowledgment
    mapping(uint256 => mapping(address => Acknowledgment)) private _acks;

    event Acknowledged(address indexed student, uint256 indexed announcementId, uint256 timestamp);

    constructor(address roleManagerAddress, address announcementLogAddress) {
        require(roleManagerAddress != address(0), "AcknowledgmentLog: roleManager is zero");
        require(announcementLogAddress != address(0), "AcknowledgmentLog: announcementLog is zero");
        roleManager = IRoleManagerForAcks(roleManagerAddress);
        announcementLog = IAnnouncementLog(announcementLogAddress);
    }

    /// @notice Acknowledge an announcement once.
    function acknowledge(uint256 announcementId) external {
        require(
            roleManager.hasRole(roleManager.STUDENT_ROLE(), msg.sender),
            "AcknowledgmentLog: student only"
        );
        require(announcementLog.announcementExists(announcementId), "AcknowledgmentLog: not found");
        require(!_acks[announcementId][msg.sender].exists, "AcknowledgmentLog: already acknowledged");

        (, , string memory targetGroup, , ) = announcementLog.getAnnouncement(announcementId);
        _enforceGroupTargeting(msg.sender, targetGroup);

        uint64 ts = uint64(block.timestamp);
        _acks[announcementId][msg.sender] = Acknowledgment({timestamp: ts, exists: true});
        emit Acknowledged(msg.sender, announcementId, ts);
    }

    /// @notice True if the student has acknowledged the announcement.
    function hasAcknowledged(uint256 announcementId, address student) external view returns (bool) {
        return _acks[announcementId][student].exists;
    }

    /// @notice Get acknowledgment timestamp (reverts if not acknowledged).
    function getAcknowledgmentTimestamp(
        uint256 announcementId,
        address student
    ) external view returns (uint256) {
        Acknowledgment storage a = _acks[announcementId][student];
        require(a.exists, "AcknowledgmentLog: not acknowledged");
        return a.timestamp;
    }

    function _enforceGroupTargeting(address student, string memory targetGroup) internal view {
        if (bytes(targetGroup).length == 0) {
            return; // public announcement
        }

        string memory studentGroup = roleManager.getGroup(student);
        require(bytes(studentGroup).length != 0, "AcknowledgmentLog: student has no group");

        // Compare by hash to avoid ambiguous string normalization issues.
        require(
            keccak256(bytes(studentGroup)) == keccak256(bytes(targetGroup)),
            "AcknowledgmentLog: wrong group"
        );
    }
}

