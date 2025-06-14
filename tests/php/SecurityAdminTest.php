<?php

namespace SilverStripe\Admin\Tests;

use SilverStripe\Core\Config\Config;
use SilverStripe\Dev\FunctionalTest;
use SilverStripe\Security\Group;
use SilverStripe\Security\Member;
use SilverStripe\Security\Permission;

class SecurityAdminTest extends FunctionalTest
{
    protected static $fixture_file = 'AdminControllerTest.yml';

    // public function testGroupExport() {
    //  $this->session()->inst_set('loggedInAs', $this->idFromFixture('Member', 'admin'));

    //  /* First, open the applicable group */
    //  $response = $this->get('admin/security/show/' . $this->idFromFixture('Group','admin'));
    //  $inputs = $this->cssParser()->getBySelector('input#Form_EditForm_Title');
    //  $this->assertNotNull($inputs);
    //  $this->assertEquals('Administrators', (string)$inputs[0]['value']);

    //  /* Then load the export page */
    //  $this->get('admin/security/EditForm/field/Members/export');
    //  $lines = preg_split('/\n/', $this->content());

    //  $this->assertEquals(count($lines), 3, "Export with members has one content row");
    //  $this->assertMatchesRegularExpression('/"","","admin@example.com"/', $lines[1], "Member values are correctly exported");
    // }

    // public function testEmptyGroupExport() {
    //  $this->session()->inst_set('loggedInAs', $this->idFromFixture('Member', 'admin'));

    //  /* First, open the applicable group */
    //  $this->get('admin/security/show/' . $this->idFromFixture('Group','empty'));
    //  $inputs = $this->cssParser()->getBySelector('input#Form_EditForm_Title');
    //  $this->assertNotNull($inputs);
    //  $this->assertEquals('Empty Group', (string)$inputs[0]['value']);

    //  /* Then load the export page */
    //  $this->get('admin/security/EditForm/field/Members/export');
    //  $lines = preg_split('/\n/', $this->content());

    //  $this->assertEquals(count($lines), 2, "Empty export only has header fields and an empty row");
    //  $this->assertEquals($lines[1], '', "Empty export only has no content row");
    // }

    public function testPermissionFieldRespectsHiddenPermissions()
    {
        $this->logInAs($this->idFromFixture(Member::class, 'admin'));

        $group = $this->objFromFixture(Group::class, 'admin');

        Config::modify()->merge(Permission::class, 'hidden_permissions', ['CMS_ACCESS_ReportAdmin']);
        $response = $this->get(sprintf('/admin/security/groups/EditForm/field/groups/item/%d/edit', $group->ID));

        $this->assertStringContainsString(
            'CMS_ACCESS_SecurityAdmin',
            $response->getBody()
        );
        $this->assertStringNotContainsString(
            'CMS_ACCESS_ReportAdmin',
            $response->getBody()
        );
    }
}
