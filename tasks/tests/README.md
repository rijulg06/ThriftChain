# Testing Files Directory

This directory contains test files for each task in the ThriftChain MVP implementation.

## File Naming Convention

- `[task-number]-testing.md`
- Examples:
  - `1.1-testing.md` - Task 1.1 testing instructions
  - `2.3-testing.md` - Task 2.3 testing instructions
  - `4.7-testing.md` - Task 4.7 testing instructions

## Purpose

Each test file serves to:
1. **Help human developers understand the code being written**
2. **Confirm functionality according to guidelines in `tasks/TESTING-GUIDE.md`**
3. **Ensure integration between tasks**
4. **Provide regression testing after changes**

## Workflow

1. Complete task implementation
2. Generate test file: `tasks/tests/[task-number]-testing.md`
3. Follow all verification steps manually
4. Verify all success criteria
5. Only mark task complete (✅) after all tests pass
6. Update `tasks-PRD_Final.md` with checkmark
7. Proceed to next task

## Test File Structure

Each test file must follow the structure defined in `tasks/TESTING-GUIDE.md` and include:
- Prerequisites verification
- Step-by-step verification with expected outputs
- Success criteria checklist
- Troubleshooting section
- Integration verification
- Next steps guidance

## Quality Assurance

- No task is complete without passing tests
- Test files must be generated before marking complete
- All success criteria must be verified
- Integration with existing system must be confirmed
