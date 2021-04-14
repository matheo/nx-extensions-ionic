import { AddExecutorSchema } from './schema';
import { default as runCommands } from '@nrwl/workspace/src/executors/run-commands/run-commands.impl';
import { ExecutorContext, getPackageManagerCommand, joinPathFragments } from '@nrwl/devkit';
import { readJsonFile } from '@nrwl/workspace';
import { writeJsonFile } from '@nrwl/workspace/src/utilities/fileutils';
import { sortObjectByKeys } from '@nrwl/workspace/src/utils/ast-utils';

export default async function runExecutor(
  options: AddExecutorSchema,
  context: ExecutorContext
) {
  const projectDir = context.workspace.projects[context.projectName].root;
  const projectRoot = joinPathFragments(`${context.root}/${projectDir}`);

  const globalPackageJsonPath = joinPathFragments(`${context.root}/package.json`);
  const globalPackageJson = readJsonFile(globalPackageJsonPath);
  const packageJsonPath = joinPathFragments(`${projectRoot}/package.json`);
  const packageJson = readJsonFile(packageJsonPath);
  const packageJsonOriginal = Object.assign({}, packageJson);

  packageJson.devDependencies = {};
  writeJsonFile(packageJsonPath, packageJson);

  await runCommands({
    command: `npx svelte-add ${options.package}`,
    cwd: projectRoot,
    parallel: false,
    color: true
  }, context);

  const packageJsonAfterRun = readJsonFile(packageJsonPath);
  const devDependencies = packageJsonAfterRun.devDependencies;

  globalPackageJson.devDependencies = {
    ...(globalPackageJson.devDependencies || {}),
    ...devDependencies,
    ...(globalPackageJson.devDependencies || {}),
  };
  globalPackageJson.devDependencies = sortObjectByKeys(globalPackageJson.devDependencies);

  writeJsonFile(globalPackageJsonPath, globalPackageJson);
  writeJsonFile(packageJsonPath, packageJsonOriginal);

  await runCommands({
    command: getPackageManagerCommand().install,
    parallel: false,
    color: true
  }, context);

  return {
    success: true
  }
}
